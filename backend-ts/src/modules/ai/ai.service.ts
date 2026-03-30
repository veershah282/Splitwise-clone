import { gemini } from '../../lib/gemini.js';
import { Type } from '@google/genai';
import Group from '../../models/group.model.js';
import AIParseLog from '../../models/aiLog.model.js';
import { NotFoundError, AIServiceError } from '../../lib/errors.js';
import { Types } from 'mongoose';
import { createExpense } from '../expenses/expenses.service.js';
import { getCurrentUser } from '../auth/auth.service.js';
import Expense from '../../models/expense.model.js';



// Simple in-memory cache for group summaries
const summaryCache = new Map<string, { summary: any; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Centralized model name for easy updates
const AI_MODEL = 'gemini-2.5-flash';


/**
 * Robust Error Formatter for AI Features
 * Extracts specific error reasons for user feedback
 */
function formatAIError(error: any): string {
    // Log the full error for debugging purposes when rate limits are hit
    console.error('--- AI DEBUG ERROR START ---');
    console.error('Message:', error.message);
    console.error('Status:', error.status || error.statusCode);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    console.error('--- AI DEBUG ERROR END ---');

    const msg = error.message || '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
        return 'rate limit exceeded';
    }
    if (msg.includes('401') || msg.toLowerCase().includes('key')) {
        return 'API key is invalid or missing.';
    }
    if (msg.includes('404')) {
        return 'The AI model is temporarily unavailable.';
    }
    if (msg.toLowerCase().includes('safety')) {
        return 'The input was flagged by safety filters.';
    }
    return `AI Error: ${msg.split('\n')[0].substring(0, 100)}`;
}


/**
 * Clean AI-generated HTML (removes markdown code blocks if present)
 */
function cleanAIHtml(html: string): string {
    return html
        .replace(/```html/gi, '')
        .replace(/```/g, '')
        .trim();
}


/**
 * AI NLP Parse Service
 */
export async function parseExpenseNLP(text: string, groupId: string, userId: string) {
    const group = await Group.findById(groupId).populate('members', 'name');
    if (!group) throw new NotFoundError('Group');

    const memberList = group.members.map((m: any) => `${m.name} (ID: ${m._id})`).join(', ');
    const systemPrompt = `
    You are a parsing engine for Splitwise. Extract expense details from text.
    Participants MUST be exactly from this list: [${memberList}].
    If a participant refers to "Me", use the name of the user who is making the request.
    Current date: ${new Date().toISOString().split('T')[0]}.
    GroupId: ${groupId}
  `;

    let parsedData: any = null;
    try {
        const response = await gemini.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text }] }],
            config: {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER },
                        payer: { type: Type.STRING },
                        participants: { type: Type.ARRAY, items: { type: Type.STRING } },
                        splitType: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: { type: Type.STRING },
                        date: { type: Type.STRING },
                    },
                    required: ['amount', 'payer', 'participants', 'splitType', 'description']
                }
            }
        });

        const responseText = response.text;
        if (responseText) {
            parsedData = JSON.parse(responseText);
        }
    } catch (error) {
        console.error(`Gemini NLP Parse Error [${AI_MODEL}]:`, error);
        parsedData = {
            amount: 50,
            payer: 'Me',
            participants: ['Alice'],
            splitType: 'EQUAL',
            description: 'AI (Demo Fallback)',
            isFallback: true,
            warning: formatAIError(error)
        };
    }

    if (!parsedData) {
        parsedData = { error: 'Empty response from AI', isFallback: true, warning: 'AI returned no content.' };
    }

    parsedData.groupId = groupId;

    const log = new AIParseLog({
        userId: new Types.ObjectId(userId),
        rawInput: text,
        parsedOutput: parsedData,
        confirmed: false
    });
    await log.save();

    return {
        id: log._id,
        parsed: parsedData
    };
}

/**
 * Generate AI Settlement Summary
 */
export async function generateGroupSummary(groupId: string, balances: any) {
    const cached = summaryCache.get(groupId);
    if (cached && cached.expiry > Date.now()) {
        return cached.summary;
    }

    const prompt = `Summarize these debts in a friendly tone: ${JSON.stringify(balances)}`;

    let textOutput = 'Summary unavailable';
    let isFallback = false;
    let warning = '';
    try {
        const response = await gemini.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        textOutput = response.text || textOutput;
    } catch (e) {
        console.warn(`Gemini Summary Error [${AI_MODEL}]:`, e);
        textOutput = 'Outstanding balances exist in this group.';
        isFallback = true;
        warning = formatAIError(e);
    }

    const result = {
        summary: textOutput,
        generated_by: 'ai',
        isFallback,
        warning
    };

    summaryCache.set(groupId, { summary: result, expiry: Date.now() + CACHE_TTL });
    return result;
}

/**
 * Confirm Parsed Expense
 */
export async function confirmExpenseParse(logId: string, userId: string) {
    const log = await AIParseLog.findById(logId);
    if (!log || log.userId.toString() !== userId) {
        throw new NotFoundError('AIParseLog');
    }

    if (log.confirmed) {
        throw new AIServiceError('Expense already confirmed', 'ALREADY_CONFIRMED');
    }

    const data = log.parsedOutput as any;
    const group = await Group.findById(data.groupId).populate('members', 'name');
    if (!group) throw new NotFoundError('Group');

    const nameToId: Record<string, string> = {};
    group.members.forEach((m: any) => {
        nameToId[m.name.toLowerCase()] = m._id.toString();
    });

    const currentUser = await getCurrentUser(userId);
    nameToId['me'] = userId;
    nameToId[currentUser.name.toLowerCase()] = userId;

    const payerName = data.payer?.toLowerCase() || 'me';
    data.paidBy = nameToId[payerName] || userId;

    data.splitDetails = (data.participants || []).map((name: string) => {
        const id = nameToId[name.toLowerCase()] || userId;
        return {
            user: id,
            amount: data.splitType === 'EQUAL' ? data.amount / (data.participants?.length || 1) : 0
        };
    });

    const expense = await createExpense(data, userId);
    log.confirmed = true;
    await log.save();

    return expense;
}

/**
 * Personal Spending Insights
 */
export async function getUserSpendingInsights(userId: string) {
    const expenses = await Expense.find({
        isDeleted: { $ne: true },
        $or: [{ paidBy: userId }, { 'splitDetails.user': userId }]
    });

    const categories: Record<string, number> = {};
    expenses.forEach(e => {
        const cat = e.category || 'Other';
        const mySplit = e.splitDetails.find(s => s.user.toString() === userId);
        const amount = mySplit ? mySplit.amount : 0;
        categories[cat] = (categories[cat] || 0) + amount;
    });

    const prompt = `Analyze this spending data and give insights: ${JSON.stringify(categories)}`;

    let textOutput = 'Insights unavailable';
    let isFallback = false;
    let warning = '';
    try {
        const response = await gemini.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        textOutput = response.text || textOutput;
    } catch (e) {
        console.warn(`Gemini Insights Error [${AI_MODEL}]:`, e);
        textOutput = 'Spending tracking is active!';
        isFallback = true;
        warning = formatAIError(e);
    }

    return {
        insights: textOutput,
        generated_by: 'ai',
        isFallback,
        warning
    };
}

