import { z } from 'zod';

export const createGroupSchema = z.object({
    name: z
        .string()
        .min(1, 'Group name is required')
        .max(100, 'Group name must be 100 characters or less')
        .trim(),
    description: z
        .string()
        .max(500)
        .trim()
        .optional(),
    members: z
        .array(z.string().email('Only registered email addresses are allowed'))
        .default([]),
});

export const addMemberSchema = z.object({
    email: z
        .string()
        .email('Valid email is required')
        .optional(),
    name: z
        .string()
        .min(1)
        .optional(),
}).refine(
    (data) => data.email || data.name,
    { message: 'Either email or name is required' }
);

export const groupIdParamSchema = z.object({
    id: z.string().min(1, 'Group ID is required'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
