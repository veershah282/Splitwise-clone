import { Router } from 'express';
import * as expensesService from '../expenses/expenses.service.js';
import authMiddleware from '../../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /balances (derived statistics)
 */
router.get('/', async (req, res) => {
    const userId = req.user!.id;
    const balances = await expensesService.getUserBalances(userId);
    res.json({ success: true, data: balances });
});

export default router;
