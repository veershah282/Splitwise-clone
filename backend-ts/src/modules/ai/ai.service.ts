import { gemini } from '../../lib/gemini.js';
import { Type } from '@google/genai';
import { Resend } from 'resend';
import Group from '../../models/group.model.js';
import AIParseLog from '../../models/aiLog.model.js';
import { NotFoundError, AIServiceError } from '../../lib/errors.js';
import { Types } from 'mongoose';
import { createExpense } from '../expenses/expenses.service.js';
import { getCurrentUser } from '../auth/auth.service.js';
import Expense from '../../models/expense.model.js';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

// Simple in-memory cache for group summaries
const summaryCache = new Map<string, { summary: any; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Centralized model name for easy updates
const AI_MODEL = 'gemini-2.0-flash';

/**
 * Robust Error Formatter for AI Features
 * Extracts specific error reasons for user feedback
 */
function formatAIError(error: any): string {
    const msg = error.message || '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
        return 'Rate limit reached (Free Tier). Try again in a minute.';
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

        const responseText = typeof response.text === 'function' ? response.text() : response.text;
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
            contents: prompt
        });
        textOutput = typeof response.text === 'function' ? response.text() : (response.text || textOutput);
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
            contents: prompt
        });
        textOutput = typeof response.text === 'function' ? response.text() : (response.text || textOutput);
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

/**
 * Generate and Send Monthly Summary Email
 */
export async function generateAndSendMonthlySummary(userId: string, email: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
        isDeleted: { $ne: true },
        date: { $gte: startOfMonth },
        $or: [{ paidBy: userId }, { 'splitDetails.user': userId }]
    });

    if (expenses.length === 0) {
        throw new AIServiceError('No expenses found for this month.', 'NO_DATA');
    }

    const summaryData = expenses.map(e => ({
        description: e.description,
        amount: e.amount,
        date: e.date
    }));

    const prompt = `You are a financial assistant. Generate a friendly HTML email summary: ${JSON.stringify(summaryData)}`;

    let isFallback = false;
    let warning = '';
    let aiSummaryHtml = '<p>Your monthly summary.</p>';
    try {
        const response = await gemini.models.generateContent({
            model: AI_MODEL,
            contents: prompt
        });
        aiSummaryHtml = typeof response.text === 'function' ? response.text() : (response.text || aiSummaryHtml);
    } catch (error) {
        console.warn(`Gemini Email Error [${AI_MODEL}]:`, error);
        isFallback = true;
        warning = formatAIError(error);
        aiSummaryHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #5bc5a7;">Monthly Spending Summary (Demo Support)</h2>
                <p>Hi there! Here is a quick breakdown of your activity:</p>
                <ul>
                    ${summaryData.map(e => `<li><strong>${e.description}</strong>: ₹${e.amount}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Splitwise AI <onboarding@resend.dev>',
            to: email,
            subject: 'Monthly Spending Summary ✨',
            html: aiSummaryHtml,
        });

        if (error) {
            console.error('Resend Error:', error);
            const resendError = error.message || 'Verification required';
            return { sent: false, data: null, expensesCount: summaryData.length, isFallback: true, warning: `Email Error: ${resendError}` };
        }

        return { sent: true, data, expensesCount: summaryData.length, isFallback, warning };
    } catch (err) {
        console.error('Email Send Crash:', err);
        return { sent: false, data: null, expensesCount: summaryData.length, isFallback: true, warning: 'Email system error. Logged to console.' };
    }
}
