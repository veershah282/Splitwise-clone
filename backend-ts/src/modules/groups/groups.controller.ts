import { Request, Response } from 'express';
import * as groupsService from './groups.service.js';
import type { CreateGroupInput, AddMemberInput } from './groups.schemas.js';

/**
 * POST /groups — Create a new group
 */
export async function createGroup(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateGroupInput;
    const group = await groupsService.createGroup(input, req.user!.id);
    res.status(201).json({ success: true, data: group });
}

/**
 * GET /groups — List user's groups with balances
 */
export async function listGroups(req: Request, res: Response): Promise<void> {
    const groups = await groupsService.getUserGroups(req.user!.id);

    res.json({
        success: true,
        data: groups,
        meta: { total: groups.length },
    });
}

/**
 * GET /groups/:id — Get single group with populated members
 */
export async function getGroup(req: Request, res: Response): Promise<void> {
    const group = await groupsService.getGroupById(req.params.id as string, req.user!.id);
    res.json({ success: true, data: group });
}

/**
 * POST /groups/:id/members — Add member to group
 */
export async function addMember(req: Request, res: Response): Promise<void> {
    const input = req.body as AddMemberInput;
    const group = await groupsService.addMemberToGroup(req.params.id as string, input, req.user!.id);
    res.json({ success: true, data: group });
}

/**
 * GET /groups/:id/balances — Get balance matrix
 */
export async function getBalances(req: Request, res: Response): Promise<void> {
    const result = await groupsService.getGroupBalances(req.params.id as string, req.user!.id);
    res.json({ success: true, data: result });
}
