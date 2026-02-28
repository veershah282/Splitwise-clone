import { Types } from 'mongoose';
import Settlement from '../../models/settlement.model.js';
import Group from '../../models/group.model.js';
import { checkMembership } from '../groups/groups.service.js';
import { NotFoundError, ValidationError, NotGroupMemberError } from '../../lib/errors.js';
import type { CreateSettlementInput } from './settlements.schemas.js';

/**
 * Create a new settlement (payment record)
 */
export async function createSettlement(input: CreateSettlementInput, userId: string) {
    // Verify group exists and user is member
    const isMember = await checkMembership(input.groupId, userId);
    if (!isMember) {
        throw new NotGroupMemberError();
    }

    const settlement = new Settlement({
        amount: Math.round(Number(input.amount)),
        paidBy: new Types.ObjectId(userId),
        paidTo: new Types.ObjectId(input.paidToUserId),
        group: new Types.ObjectId(input.groupId),
        note: input.note || 'Settlement',
        date: new Date(),
    });

    await settlement.save();

    // Return populated settlement
    return Settlement.findById(settlement._id)
        .populate('paidBy', 'name email')
        .populate('paidTo', 'name email');
}

/**
 * Get settlements for a specific group
 */
export async function getGroupSettlements(groupId: string, userId: string) {
    const isMember = await checkMembership(groupId, userId);
    if (!isMember) {
        throw new NotGroupMemberError();
    }

    return Settlement.find({ group: groupId })
        .populate('paidBy', 'name email')
        .populate('paidTo', 'name email')
        .sort({ createdAt: -1 });
}

/**
 * Get the authenticated user's settlements across all groups
 */
export async function getUserSettlements(userId: string) {
    return Settlement.find({
        $or: [
            { paidBy: userId },
            { paidTo: userId },
        ],
    })
        .populate('paidBy', 'name email')
        .populate('paidTo', 'name email')
        .populate('group', 'name')
        .sort({ createdAt: -1 })
        .limit(20);
}
