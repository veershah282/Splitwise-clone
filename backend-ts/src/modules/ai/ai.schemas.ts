import { z } from 'zod';

export const parseExpenseSchema = z.object({
    text: z.string().min(1, 'Input text is required'),
    groupId: z.string().min(1, 'Group context is required'),
});

export const confirmParseSchema = z.object({
    logId: z.string().min(1, 'Log ID is required'),
});

export type ParseExpenseInput = z.infer<typeof parseExpenseSchema>;
export type ConfirmParseInput = z.infer<typeof confirmParseSchema>;
