import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import logger from '../lib/logger.js';

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent response shape.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    // --- Known AppError subclasses ---
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(err.details ? { details: err.details } : {}),
            },
        });
        return;
    }

    // --- Zod validation errors ---
    if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details,
            },
        });
        return;
    }

    // --- Mongoose validation errors ---
    if (err instanceof mongoose.Error.ValidationError) {
        const details = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));

        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details,
            },
        });
        return;
    }

    // --- Mongoose cast errors (invalid ObjectId, etc.) ---
    if (err instanceof mongoose.Error.CastError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: `Invalid ${err.path}: ${err.value}`,
            },
        });
        return;
    }

    // --- MongoDB duplicate key error ---
    if ((err as any).code === 11000) {
        const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
        res.status(409).json({
            success: false,
            error: {
                code: 'CONFLICT',
                message: `Duplicate value for ${field}`,
            },
        });
        return;
    }

    // --- Unexpected / unknown errors ---
    logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');

    res.status(500).json({
        success: false,
        error: {
            code: 'SERVER_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message,
        },
    });
}

export default errorHandler;
