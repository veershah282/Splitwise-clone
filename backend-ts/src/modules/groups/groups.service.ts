import mongoose, { Types } from 'mongoose';
import Group from '../../models/group.model.js';
import User from '../../models/user.model.js';
import Expense from '../../models/expense.model.js';
import Settlement from '../../models/settlement.model.js';
import { NotFoundError, NotGroupMemberError, ValidationError } from '../../lib/errors.js';
import type { CreateGroupInput } from './groups.schemas.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Helper to check if a user is a member of a group
 */
export async function checkMembership(groupId: string, userId: string): Promise<boolean> {
    const group = await Group.findOne({ _id: groupId, members: userId });
    return !!group;
}

/**
 * Create a new group.
 * Members can be emails (lookup existing) or names (create placeholder users).
 * Preserves existing frontend behavior exactly.
 */
export async function createGroup(input: CreateGroupInput, creatorId: string) {
    const currentUserId = new Types.ObjectId(creatorId);
    const memberIds: Types.ObjectId[] = [currentUserId];

    for (const email of input.members) {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.isRegistered) {
            throw new ValidationError(`User with email "${email}" is not registered. Groups can only be created with registered email addresses.`);
        }

        memberIds.push(user._id);
    }

    // Deduplicate
    const uniqueIdStrings = [...new Set(memberIds.map((id) => id.toString()))];
    const uniqueMemberIds = uniqueIdStrings.map((id) => new Types.ObjectId(id));

    const group = new Group({
        name: input.name,
        description: input.description,
        members: uniqueMemberIds,
        createdBy: currentUserId,
    });

    return group.save();
}

/**
 * Get all groups the user is a member of, with balance calculations.
 * Returns the shape the frontend dashboard expects.
 */
export async function getUserGroups(userId: string): Promise<any[]> {
    const groups = await Group.find({ members: userId }).sort({ createdAt: -1 });

    const groupsWithBalances = await Promise.all(
        groups.map(async (group) => {
            const expenses = await Expense.find({ group: group._id, isDeleted: { $ne: true } });
            const settlements = await Settlement.find({ group: group._id });

            let balance = 0;

            // Calculate expense-based balance
            expenses.forEach((exp) => {
                if (exp.paidBy.toString() === userId) {
                    // I paid: others owe me their split amounts
                    exp.splitDetails.forEach((split) => {
                        if (split.user && split.user.toString() !== userId) {
                            balance += split.amount;
                        }
                    });
                } else {
                    // Someone else paid: I owe my split
                    const mySplit = exp.splitDetails.find(
                        (s) => s.user && s.user.toString() === userId
                    );
                    if (mySplit) {
                        balance -= mySplit.amount;
                    }
                }
            });

            // Factor in settlements
            settlements.forEach((s) => {
                if (s.paidBy.toString() === userId) {
                    // I paid someone → my balance goes down (I owe less)
                    balance += s.amount;
                }
                if (s.paidTo.toString() === userId) {
                    // Someone paid me → my balance goes down (they owe me less)
                    balance -= s.amount;
                }
            });

            return {
                ...group.toJSON(),
                userBalance: balance,
                totalMembers: group.members?.length || 0,
            };
        })
    );

    return groupsWithBalances;
}

/**
 * Get a single group by ID with populated members.
 * Enforces group membership authorization.
 */
export async function getGroupById(groupId: string, userId: string): Promise<any> {
    const group = await Group.findById(groupId).populate('members', 'name email isRegistered');

    if (!group) {
        throw new NotFoundError('Group');
    }

    // Authorization: user must be a member
    const isMember = group.members.some(
        (m: any) => m._id.toString() === userId
    );
    if (!isMember) {
        throw new NotGroupMemberError();
    }

    return group;
}

/**
 * Add a member to an existing group
 */
export async function addMemberToGroup(
    groupId: string,
    memberIdentifier: { email?: string; name?: string },
    requesterId: string
) {
    const group = await Group.findById(groupId);
    if (!group) {
        throw new NotFoundError('Group');
    }

    // Authorization: requester must be a member
    const isMember = group.members.some((m) => m.toString() === requesterId);
    if (!isMember) {
        throw new NotGroupMemberError();
    }

    if (!memberIdentifier.email) {
        throw new ValidationError('Groups can only be modified using registered email addresses. Names are not allowed.');
    }

    const user = await User.findOne({ email: memberIdentifier.email.toLowerCase() });

    if (!user || !user.isRegistered) {
        throw new ValidationError(`User with email "${memberIdentifier.email}" is not registered. Only registered users can be added to groups.`);
    }

    // Check not already a member
    if (!group.members.some((m) => m.toString() === user!._id.toString())) {
        group.members.push(user._id);
        await group.save();
    }

    return Group.findById(groupId).populate('members', 'name email isRegistered');
}

/**
 * Get balance matrix for a group.
 * Returns net balances between all members.
 */
export async function getGroupBalances(groupId: string, userId: string) {
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) throw new NotFoundError('Group');

    const isMember = group.members.some((m: any) => m._id.toString() === userId);
    if (!isMember) throw new NotGroupMemberError();

    const expenses = await Expense.find({ group: groupId, isDeleted: { $ne: true } });
    const settlements = await Settlement.find({ group: groupId });

    // Build net balance map: who owes whom
    // balances[A][B] > 0 means B owes A that amount
    const balances: Record<string, Record<string, number>> = {};

    const memberIds = group.members.map((m: any) => m._id.toString());
    for (const id of memberIds) {
        balances[id] = {};
        for (const otherId of memberIds) {
            balances[id][otherId] = 0;
        }
    }

    // Process expenses
    for (const exp of expenses) {
        const payerId = exp.paidBy.toString();
        for (const split of exp.splitDetails) {
            const owerId = split.user.toString();
            if (payerId !== owerId && balances[payerId]?.[owerId] !== undefined) {
                balances[payerId][owerId] += split.amount;
            }
        }
    }

    // Process settlements
    for (const s of settlements) {
        const fromId = s.paidBy.toString();
        const toId = s.paidTo.toString();
        if (balances[toId]?.[fromId] !== undefined) {
            balances[toId][fromId] -= s.amount;
        }
    }

    // Calculate net balances
    const netBalances: Array<{ from: any; to: any; amount: number }> = [];
    const processed = new Set<string>();

    for (const a of memberIds) {
        for (const b of memberIds) {
            if (a === b) continue;
            const key = [a, b].sort().join('-');
            if (processed.has(key)) continue;
            processed.add(key);

            const net = (balances[a]?.[b] || 0) - (balances[b]?.[a] || 0);
            if (Math.abs(net) > 0.01) {
                const memberA = group.members.find((m: any) => m._id.toString() === a);
                const memberB = group.members.find((m: any) => m._id.toString() === b);
                if (net > 0) {
                    netBalances.push({ from: memberB, to: memberA, amount: Math.round(net) });
                } else {
                    netBalances.push({ from: memberA, to: memberB, amount: Math.round(Math.abs(net)) });
                }
            }
        }
    }

    return { members: group.members, balances: netBalances };
}
