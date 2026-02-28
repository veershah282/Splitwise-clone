import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiService from '../src/modules/ai/ai.service';
import Group from '../src/models/group.model';
import AIParseLog from '../src/models/aiLog.model';
import Expense from '../src/models/expense.model';
import * as geminiLib from '../src/lib/gemini';
import { AIServiceError, NotFoundError } from '../src/lib/errors';

// Complex mocking setup
vi.mock('../src/models/group.model');
vi.mock('../src/models/aiLog.model');
vi.mock('../src/models/expense.model');
vi.mock('../src/modules/expenses/expenses.service');
vi.mock('../src/modules/auth/auth.service');
vi.mock('resend', () => {
    return {
        Resend: class MockResend {
            emails = {
                send: vi.fn().mockResolvedValue({ data: { id: 'test_id' }, error: null })
            }
        }
    };
});

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('parseExpenseNLP', () => {
        it('should call gemini to parse expense and create a log entry', async () => {
            const mockGroup = {
                _id: 'group1',
                members: [{ _id: '5f8d04f3b54764421b7156e7', name: 'Alice' }, { _id: 'user2', name: 'Bob' }]
            };

            (Group.findById as any).mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockGroup)
            });

            const parsedOutputMock = {
                amount: 50,
                payer: 'Me',
                participants: ['Alice', 'Bob'],
                splitType: 'EQUAL',
                description: 'Dinner'
            };

            const mockGenerateContent = vi.fn().mockResolvedValue({
                text: JSON.stringify(parsedOutputMock)
            });

            vi.spyOn(geminiLib.gemini.models, 'generateContent').mockImplementation(mockGenerateContent);

            const saveSpy = vi.fn().mockResolvedValue(true);
            (AIParseLog as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
                return {
                    _id: 'log1',
                    save: saveSpy
                };
            });

            const result = await aiService.parseExpenseNLP('Dinner for 50 bucks with Bob', 'group1', '5f8d04f3b54764421b7156e7');

            expect(mockGenerateContent).toHaveBeenCalled();
            expect(result.id).toBeDefined();
            expect(result.parsed.amount).toBe(50);
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should throw NotFoundError if group does not exist', async () => {
            (Group.findById as any).mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            await expect(aiService.parseExpenseNLP('test', 'group1', 'user1')).rejects.toThrow(NotFoundError);
        });
    });

    describe('generateAndSendMonthlySummary', () => {
        it('should throw error if no expenses found this month', async () => {
            (Expense.find as any).mockResolvedValue([]);
            await expect(aiService.generateAndSendMonthlySummary('user1', 'test@test.com')).rejects.toThrow(AIServiceError);
        });

        it('should generate summary using gemini and send via resend', async () => {
            (Expense.find as any).mockResolvedValue([
                { description: 'Dinner', amount: 50, date: new Date() }
            ]);

            const mockGenerateContent = vi.fn().mockResolvedValue({
                text: '<p>You spent 50</p>'
            });
            vi.spyOn(geminiLib.gemini.models, 'generateContent').mockImplementation(mockGenerateContent);

            // Resend is mocked globally at the top

            const result = await aiService.generateAndSendMonthlySummary('user1', 'test@test.com');

            expect(mockGenerateContent).toHaveBeenCalled();
            expect(result.sent).toBe(true);
            expect(result.expensesCount).toBe(1);
        });
    });
});
