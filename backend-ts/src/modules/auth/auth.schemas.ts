import { z } from 'zod';

export const registerSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be 100 characters or less')
        .trim(),
    email: z
        .string()
        .email('Valid email is required')
        .max(255)
        .transform((v) => v.toLowerCase().trim()),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
    email: z
        .string()
        .email('Valid email is required')
        .transform((v) => v.toLowerCase().trim()),
    password: z
        .string()
        .min(1, 'Password is required'),
});

export const refreshSchema = z.object({
    refreshToken: z
        .string()
        .min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
