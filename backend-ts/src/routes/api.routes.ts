import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import groupsRoutes from '../modules/groups/groups.routes.js';
import expensesRoutes from '../modules/expenses/expenses.routes.js';
import settlementsRoutes from '../modules/settlements/settlements.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';

const router = Router();

/**
 * API Routes
 * These endpoints return the structured response envelope:
 * { success: true, data: ..., meta: ... }
 */

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/groups', groupsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/settlements', settlementsRoutes);
router.use('/ai', aiRoutes);

export default router;
