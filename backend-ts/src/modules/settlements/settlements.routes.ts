import { Router } from 'express';
import * as settlementsController from './settlements.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { createSettlementSchema } from './settlements.schemas.js';
import authMiddleware from '../../middleware/auth.js';

const router = Router();

// All settlement routes require auth
router.use(authMiddleware);

router.post('/', validateBody(createSettlementSchema), settlementsController.createSettlement);
router.get('/group/:groupId', settlementsController.getGroupSettlements);
router.get('/my', settlementsController.getUserSettlements);

export default router;
