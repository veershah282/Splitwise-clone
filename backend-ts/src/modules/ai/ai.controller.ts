import { Request, Response } from 'express';
import * as aiService from './ai.service.js';
import * as groupsService from '../groups/groups.service.js';
import type { ParseExpenseInput, ConfirmParseInput } from './ai.schemas.js';
import { NotFoundError } from '../../lib/errors.js';

export async function parseExpense(req: Request, res: Response): Promise<void> {
    const { text, groupId } = req.body as ParseExpenseInput;
    const result = await aiService.parseExpenseNLP(text, groupId, req.user!.id);

    res.json({
        success: true,
        data: result
    });
}

export async function confirmParse(req: Request, res: Response): Promise<void> {
    const { logId } = req.body as ConfirmParseInput;
    const result = await aiService.confirmExpenseParse(logId, req.user!.id);
    res.json({ success: true, data: result });
}

export async function getGroupSummary(req: Request, res: Response): Promise<void> {
    const groupId = req.params.id as string;
    const balances = await groupsService.getGroupBalances(groupId, req.user!.id);
    const result = await aiService.generateGroupSummary(groupId, balances);

    res.json({
        success: true,
        data: result
    });
}

export async function getUserInsights(req: Request, res: Response): Promise<void> {
    const result = await aiService.getUserSpendingInsights(req.user!.id);
    res.json({ success: true, data: result });
}

