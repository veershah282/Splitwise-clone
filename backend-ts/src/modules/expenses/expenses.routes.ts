import { Router } from 'express';
import * as expensesController from './expenses.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from './expenses.schemas.js';
import authMiddleware from '../../middleware/auth.js';

const router = Router();

// All expense routes require auth
router.use(authMiddleware);

// Expense endpoints
router.post('/', validateBody(createExpenseSchema), expensesController.createExpense);
router.get('/group/:groupId', expensesController.getGroupExpenses);
router.get('/balances', expensesController.getBalances);
router.get('/monthly-spending', expensesController.getMonthlySpending);
router.get('/activity', expensesController.getActivity);
router.get('/:id', expensesController.getExpense);
router.put('/:id', validateBody(updateExpenseSchema), expensesController.updateExpense);
router.delete('/:id', expensesController.deleteExpense);

export default router;
