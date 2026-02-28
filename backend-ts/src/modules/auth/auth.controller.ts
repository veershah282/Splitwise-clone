import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schemas.js';

/**
 * POST /auth/register
 * Response: { success, data: { accessToken, refreshToken, user } }
 */
export async function register(req: Request, res: Response): Promise<void> {
    const input = req.body as RegisterInput;
    const result = await authService.registerUser(input);

    res.status(201).json({
        success: true,
        data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        },
    });
}

/**
 * POST /auth/login
 * Response: { success, data: { accessToken, refreshToken, user } }
 */
export async function login(req: Request, res: Response): Promise<void> {
    const input = req.body as LoginInput;
    const result = await authService.loginUser(input);

    res.json({
        success: true,
        data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        },
    });
}

/**
 * POST /auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({
        success: true,
        data: result,
    });
}

/**
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
    await authService.logoutUser(req.user!.id);
    res.json({
        success: true,
        data: { message: 'Logged out successfully' },
    });
}

/**
 * GET /auth/me
 * Returns current user (minus password)
 */
export async function me(req: Request, res: Response): Promise<void> {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({
        success: true,
        data: user,
    });
}
