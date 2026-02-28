import { Router } from 'express';
import * as groupsController from './groups.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { createGroupSchema, addMemberSchema } from './groups.schemas.js';
import authMiddleware from '../../middleware/auth.js';
import * as expensesController from '../expenses/expenses.controller.js';
import * as settlementsController from '../settlements/settlements.controller.js';

const router = Router();

// All group routes require auth
router.use(authMiddleware);

router.post('/', validateBody(createGroupSchema), groupsController.createGroup);
router.get('/', groupsController.listGroups);
router.get('/:id', groupsController.getGroup);
router.post('/:id/members', validateBody(addMemberSchema), groupsController.addMember);
router.get('/:id/balances', groupsController.getBalances);

// Nested routes
router.post('/:id/expenses', expensesController.createExpense);
router.get('/:id/expenses', expensesController.getGroupExpenses);
router.post('/:id/settlements', settlementsController.createSettlement);
router.get('/:id/settlements', settlementsController.getGroupSettlements);

export default router;
