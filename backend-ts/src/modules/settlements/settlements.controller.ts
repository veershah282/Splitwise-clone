import { Request, Response } from 'express';
import * as settlementsService from './settlements.service.js';
import type { CreateSettlementInput } from './settlements.schemas.js';

/**
 * POST /settlements or POST /groups/:id/settlements
 */
export async function createSettlement(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateSettlementInput;
    // groupId from URL params if available
    if (req.params.id && !input.groupId) {
        input.groupId = req.params.id as string;
    }

    const settlement = await settlementsService.createSettlement(input, req.user!.id);
    res.status(201).json({ success: true, data: settlement });
}

/**
 * GET /settlements/group/:groupId or GET /groups/:id/settlements
 */
export async function getGroupSettlements(req: Request, res: Response): Promise<void> {
    const groupId = (req.params.groupId || req.params.id) as string;
    const settlements = await settlementsService.getGroupSettlements(groupId, req.user!.id);

    res.json({
        success: true,
        data: settlements,
        meta: { total: settlements.length },
    });
}

/**
 * GET /settlements/my
 */
export async function getUserSettlements(req: Request, res: Response): Promise<void> {
    const settlements = await settlementsService.getUserSettlements(req.user!.id);

    res.json({
        success: true,
        data: settlements,
        meta: { total: settlements.length },
    });
}
