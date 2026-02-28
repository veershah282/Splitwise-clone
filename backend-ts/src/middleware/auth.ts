import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { AuthenticationError, TokenExpiredError, TokenInvalidError } from '../lib/errors.js';
import logger from '../lib/logger.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}

/**
 * Auth middleware that supports both:
 * - x-auth-token header
 * - Authorization: Bearer <token>
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Try both header formats
    const xAuthToken = req.header('x-auth-token');
    const bearerHeader = req.header('Authorization');

    let token: string | undefined;

    if (xAuthToken) {
        token = xAuthToken;
    } else if (bearerHeader?.startsWith('Bearer ')) {
        token = bearerHeader.slice(7);
    }

    if (!token) {
        throw new AuthenticationError('No token, authorization denied', 'AUTH_REQUIRED');
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret) as { user: { id: string } };
        req.user = decoded.user;

        // Ensure user still exists in DB
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new AuthenticationError('User no longer exists. Please re-login.', 'TOKEN_INVALID');
        }

        next();
    } catch (err) {
        if (err instanceof AuthenticationError) {
            throw err;
        }
        if (err instanceof jwt.TokenExpiredError) {
            throw new TokenExpiredError();
        }
        if (err instanceof jwt.JsonWebTokenError) {
            throw new TokenInvalidError();
        }
        logger.error({ err }, 'Auth middleware error');
        throw new TokenInvalidError();
    }
}

export default authMiddleware;
