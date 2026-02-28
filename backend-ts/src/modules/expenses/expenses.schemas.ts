import { z } from 'zod';

const splitDetailSchema = z.object({
    user: z.string().min(1, 'User ID is required'),
    amount: z.number().or(z.string().transform(Number)),
    percentage: z.number().optional(),
    shares: z.number().optional(),
});

export const createExpenseSchema = z.object({
    description: z
        .string()
        .min(1, 'Description is required')
        .max(255)
        .trim(),
    amount: z
        .number()
        .positive('Amount must be positive')
        .or(z.string().transform(Number)),
    groupId: z.string().optional(),
    splitType: z
        .enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])
        .default('EQUAL'),
    splitDetails: z.array(splitDetailSchema).min(1, 'Split details are required'),
    paidBy: z.string().optional(),
    category: z.string().max(100).trim().optional(),
    date: z.string().datetime().or(z.string()).optional(),
});

export const updateExpenseSchema = z.object({
    description: z.string().min(1).max(255).trim().optional(),
    amount: z.number().positive().or(z.string().transform(Number)).optional(),
    splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']).optional(),
    splitDetails: z.array(splitDetailSchema).optional(),
    category: z.string().max(100).trim().optional(),
    date: z.string().datetime().or(z.string()).optional(),
});

export const paginationSchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
