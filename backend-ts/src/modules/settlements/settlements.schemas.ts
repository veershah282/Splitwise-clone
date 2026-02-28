import { z } from 'zod';

export const createSettlementSchema = z.object({
    amount: z
        .number()
        .positive('Amount must be greater than 0')
        .or(z.string().transform(Number)),
    paidToUserId: z.string().min(1, 'Recipient user is required'),
    groupId: z.string().min(1, 'Group is required'),
    note: z.string().max(255).trim().optional().default('Settlement'),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
