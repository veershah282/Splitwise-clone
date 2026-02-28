import { Request, Response } from 'express';
import * as expensesService from './expenses.service.js';
import type { CreateExpenseInput, UpdateExpenseInput } from './expenses.schemas.js';

/**
 * POST /expenses or POST /groups/:id/expenses
 */
export async function createExpense(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateExpenseInput;
    // Support both: groupId in body or in URL params
    if (req.params.id && !input.groupId) {
        input.groupId = req.params.id as string;
    }
    const expense = await expensesService.createExpense(input, req.user!.id);
    res.status(201).json({ success: true, data: expense });
}

/**
 * GET /expenses/group/:groupId or GET /groups/:id/expenses
 */
export async function getGroupExpenses(req: Request, res: Response): Promise<void> {
    const groupId = (req.params.groupId || req.params.id) as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await expensesService.getGroupExpenses(groupId, req.user!.id, { page, limit });

    res.json({
        success: true,
        data: result.expenses,
        meta: result.meta,
    });
}

/**
 * GET /expenses/balances
 */
export async function getBalances(req: Request, res: Response): Promise<void> {
    const balances = await expensesService.getUserBalances(req.user!.id);
    res.json({ success: true, data: balances });
}

/**
 * GET /expenses/monthly-spending
 */
export async function getMonthlySpending(req: Request, res: Response): Promise<void> {
    const data = await expensesService.getMonthlySpending(req.user!.id);
    res.json({ success: true, data });
}

/**
 * GET /expenses/activity
 */
export async function getActivity(req: Request, res: Response): Promise<void> {
    const activity = await expensesService.getUserActivity(req.user!.id);
    res.json({ success: true, data: activity });
}

/**
 * PUT /expenses/:id
 */
export async function updateExpense(req: Request, res: Response): Promise<void> {
    const input = req.body as UpdateExpenseInput;
    const expense = await expensesService.updateExpense(req.params.id as string, input, req.user!.id);
    res.json({ success: true, data: expense });
}

/**
 * GET /expenses/:id
 */
export async function getExpense(req: Request, res: Response): Promise<void> {
    const expense = await expensesService.getExpenseById(req.params.id as string, req.user!.id);
    res.json({ success: true, data: expense });
}

/**
 * DELETE /expenses/:id
 */
export async function deleteExpense(req: Request, res: Response): Promise<void> {
    const result = await expensesService.deleteExpense(req.params.id as string, req.user!.id, true);
    res.json({ success: true, data: result });
}
