import mongoose, { Types } from 'mongoose';
import Expense, { SplitType, IEmbeddedSplit } from '../../models/expense.model.js';
import Group from '../../models/group.model.js';
import Settlement from '../../models/settlement.model.js';
import { checkMembership } from '../groups/groups.service.js';
import { NotFoundError, ValidationError, ForbiddenError, SplitSumMismatchError, NotGroupMemberError } from '../../lib/errors.js';
import type { CreateExpenseInput, UpdateExpenseInput } from './expenses.schemas.js';

/**
 * Create a new expense with split details.
 */
export async function createExpense(input: CreateExpenseInput, userId: string) {
    // Validate group exists if provided
    if (input.groupId) {
        // Validate creator is a member
        const isMember = await checkMembership(input.groupId, userId);
        if (!isMember) {
            throw new NotGroupMemberError();
        }

        // Validate payer is a member if explicitly provided
        if (input.paidBy) {
            const isPayerMember = await checkMembership(input.groupId, input.paidBy);
            if (!isPayerMember) {
                throw new NotGroupMemberError();
            }
        }
    }

    if (!input.splitDetails || input.splitDetails.length === 0) {
        throw new ValidationError('Split details are required');
    }

    const totalAmount = Math.round(Number(input.amount));

    // Process split details based on split type
    const processedSplits: IEmbeddedSplit[] = input.splitDetails.map((split) => ({
        user: new Types.ObjectId(split.user),
        amount: Math.round(Number(split.amount)),
        percentage: split.percentage,
        shares: split.shares,
    }));

    // Validate splits sum for EXACT type
    if (input.splitType === 'EXACT') {
        const splitSum = processedSplits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(splitSum - totalAmount) > 1) {
            throw new SplitSumMismatchError(totalAmount, splitSum);
        }
    }

    // Validate PERCENTAGE sums to 100
    if (input.splitType === 'PERCENTAGE') {
        const pctSum = processedSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);
        if (Math.abs(pctSum - 100) > 0.01) {
            throw new ValidationError('Percentages must sum to 100');
        }
    }

    // Validate SHARES are positive integers
    if (input.splitType === 'SHARES') {
        const hasInvalidShares = processedSplits.some((s) => !s.shares || s.shares <= 0 || !Number.isInteger(s.shares));
        if (hasInvalidShares) {
            throw new ValidationError('Shares must be positive integers');
        }
    }

    const expense = new Expense({
        description: input.description,
        amount: totalAmount,
        paidBy: input.paidBy ? new Types.ObjectId(input.paidBy) : new Types.ObjectId(userId),
        group: input.groupId ? new Types.ObjectId(input.groupId) : null,
        splitType: input.splitType || SplitType.EQUAL,
        splitDetails: processedSplits,
        category: input.category,
        createdBy: new Types.ObjectId(userId),
        date: input.date ? new Date(input.date) : new Date(),
    });

    return expense.save();
}

/**
 * Get expenses for a specific group.
 */
export async function getGroupExpenses(
    groupId: string,
    userId: string,
    options: { page?: number; limit?: number } = {}
) {
    const isMember = await checkMembership(groupId, userId);
    if (!isMember) {
        throw new NotGroupMemberError();
    }

    const query = { group: groupId, isDeleted: { $ne: true } };
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
        Expense.find(query)
            .populate('paidBy', 'name')
            .populate('splitDetails.user', 'name')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit),
        Expense.countDocuments(query),
    ]);

    return {
        expenses,
        meta: {
            total,
            page,
            limit,
            hasMore: skip + expenses.length < total,
        },
    };
}

/**
 * Get global balances for the authenticated user:
 * { totalOwedToYou, totalYouOwe } — accounting for settlements
 */
export async function getUserBalances(userId: string) {
    const expenses = await Expense.find({
        isDeleted: { $ne: true },
        $or: [
            { paidBy: userId },
            { 'splitDetails.user': userId },
        ],
    });

    const settlements = await Settlement.find({
        $or: [
            { paidBy: userId },
            { paidTo: userId },
        ],
    });

    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    expenses.forEach((expense) => {
        if (expense.paidBy.toString() === userId) {
            expense.splitDetails.forEach((split) => {
                if (split.user && split.user.toString() !== userId) {
                    totalOwedToYou += split.amount;
                }
            });
        } else {
            const yourSplit = expense.splitDetails.find(
                (s) => s.user && s.user.toString() === userId
            );
            if (yourSplit) {
                totalYouOwe += yourSplit.amount;
            }
        }
    });

    // Factor in settlements
    settlements.forEach((s) => {
        if (s.paidBy.toString() === userId) {
            // I paid someone: reduces what I owe
            totalYouOwe -= s.amount;
        }
        if (s.paidTo.toString() === userId) {
            // Someone paid me: reduces what's owed to me
            totalOwedToYou -= s.amount;
        }
    });

    return {
        totalOwedToYou: parseFloat(Math.max(0, totalOwedToYou).toFixed(2)),
        totalYouOwe: parseFloat(Math.max(0, totalYouOwe).toFixed(2)),
    };
}

/**
 * Get monthly spending data for the past 6 months.
 */
export async function getMonthlySpending(userId: string) {
    const expenses = await Expense.find({
        isDeleted: { $ne: true },
        $or: [
            { paidBy: userId },
            { 'splitDetails.user': userId },
        ],
    });

    const monthlySpends: Record<string, number> = {};
    expenses.forEach((expense) => {
        const date = expense.date ? new Date(expense.date) : new Date(expense.createdAt);
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        const key = `${year}-${month}`;

        const mySplit = expense.splitDetails.find(
            (s) => s.user && s.user.toString() === userId
        );
        const userShare = mySplit ? mySplit.amount : 0;
        monthlySpends[key] = (monthlySpends[key] || 0) + userShare;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6MonthsArr: Array<{ name: string; amount: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const mIdx = targetDate.getUTCMonth();
        const y = targetDate.getUTCFullYear();
        const key = `${y}-${mIdx}`;

        last6MonthsArr.push({
            name: months[mIdx],
            amount: Math.round(monthlySpends[key] || 0),
        });
    }

    return last6MonthsArr;
}

/**
 * Get recent activity for the user.
 */
export async function getUserActivity(userId: string) {
    const expenses = await Expense.find({
        isDeleted: { $ne: true },
        $or: [
            { paidBy: userId },
            { 'splitDetails.user': userId },
        ],
    })
        .populate('paidBy', 'name email')
        .populate('group', 'name')
        .populate('splitDetails.user', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

    return expenses.map((exp) => ({
        id: exp._id,
        description: exp.description,
        amount: exp.amount,
        paidBy: exp.paidBy,
        group: exp.group || { name: 'Individual' },
        date: exp.date || exp.createdAt,
        splitDetails: exp.splitDetails,
    }));
}

/**
 * Update an existing expense.
 */
export async function updateExpense(expenseId: string, input: UpdateExpenseInput, userId: string) {
    const expense = await Expense.findById(expenseId);
    if (!expense || expense.isDeleted) {
        throw new NotFoundError('Expense');
    }

    // Authorization: only payer or creator can edit
    if (expense.paidBy.toString() !== userId && expense.createdBy?.toString() !== userId) {
        throw new ForbiddenError('Only the payer or creator can edit this expense');
    }

    if (expense.group) {
        const isMember = await checkMembership(expense.group.toString(), userId);
        if (!isMember) throw new NotGroupMemberError();
    }

    if (input.description) expense.description = input.description;
    if (input.amount) expense.amount = Math.round(Number(input.amount));
    if (input.splitType) expense.splitType = input.splitType as SplitType;
    if (input.category) expense.category = input.category;
    if (input.date) expense.date = new Date(input.date);

    if (input.splitDetails) {
        expense.splitDetails = input.splitDetails.map((s) => ({
            user: new Types.ObjectId(s.user),
            amount: Math.round(Number(s.amount)),
            percentage: s.percentage,
            shares: s.shares,
        }));
    }

    return expense.save();
}

/**
 * Delete an expense.
 * When softDelete is true, the expense is soft-deleted.
 */
export async function deleteExpense(expenseId: string, userId: string, softDelete: boolean = false) {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
        throw new NotFoundError('Expense');
    }

    if (expense.paidBy.toString() !== userId && expense.createdBy?.toString() !== userId) {
        throw new ForbiddenError('Not authorized');
    }

    if (expense.group) {
        const isMember = await checkMembership(expense.group.toString(), userId);
        if (!isMember) throw new NotGroupMemberError();
    }

    if (softDelete) {
        expense.isDeleted = true;
        await expense.save();
    } else {
        await Expense.findByIdAndDelete(expenseId);
    }

    return { message: 'Expense deleted successfully' };
}

/**
 * Get individual expense detail.
 */
export async function getExpenseById(expenseId: string, userId: string) {
    const expense = await Expense.findById(expenseId)
        .populate('paidBy', 'name email')
        .populate('group', 'name')
        .populate('splitDetails.user', 'name email');

    if (!expense || expense.isDeleted) {
        throw new NotFoundError('Expense');
    }

    // Authorization: if group expense, must be member. If individual, must be participant or payer.
    if (expense.group) {
        const isMember = await checkMembership(expense.group.toString(), userId);
        if (!isMember) throw new NotGroupMemberError();
    } else {
        const isPayer = expense.paidBy.toString() === userId;
        const isParticipant = expense.splitDetails.some(s => s.user.toString() === userId);
        if (!isPayer && !isParticipant) throw new ForbiddenError();
    }

    return expense;
}
