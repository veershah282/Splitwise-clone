import { Router } from 'express';
import * as aiController from './ai.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { parseExpenseSchema, confirmParseSchema } from './ai.schemas.js';
import authMiddleware from '../../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Strict rate limit for AI endpoints (20 per min per user)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Try again later.' } }
});

router.use(authMiddleware);
router.use(aiLimiter);

router.post('/parse-expense', validateBody(parseExpenseSchema), aiController.parseExpense);
router.post('/parse-expense/confirm', validateBody(confirmParseSchema), aiController.confirmParse);
router.post('/monthly-summary-email', aiController.sendMonthlySummaryEmail);
router.get('/groups/:id/summary', aiController.getGroupSummary);
router.get('/users/me/insights', aiController.getUserInsights);

export default router;
