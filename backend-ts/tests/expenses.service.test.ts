import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as expensesService from '../src/modules/expenses/expenses.service';
import * as groupsService from '../src/modules/groups/groups.service';
import Expense from '../src/models/expense.model';
import { NotGroupMemberError } from '../src/lib/errors';

vi.mock('../src/models/expense.model');
vi.mock('../src/modules/groups/groups.service');

describe('Expenses Service - Payer Choice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createExpense', () => {
        it('should fail if the chosen payer (paidBy) is not a member of the group', async () => {
            const input = {
                description: 'Team Lunch',
                amount: 100,
                groupId: 'group-id',
                splitType: 'EQUAL',
                splitDetails: [
                    { user: 'user1', amount: 50 },
                    { user: 'user2', amount: 50 }
                ],
                paidBy: 'non-member-id'
            };
            const creatorId = 'creator-id';

            // Creator is a member
            (groupsService.checkMembership as any).mockImplementation((groupId, userId) => {
                if (userId === creatorId) return Promise.resolve(true);
                if (userId === 'non-member-id') return Promise.resolve(false);
                return Promise.resolve(false);
            });

            await expect(expensesService.createExpense(input as any, creatorId))
                .rejects.toThrow(NotGroupMemberError);
        });
    });
});
