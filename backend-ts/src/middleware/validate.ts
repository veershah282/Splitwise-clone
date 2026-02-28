import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors.js';

/**
 * Creates a validation middleware for request body, params, and/or query.
 * Uses Zod schemas for type-safe validation.
 */
export function validate(schema: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.params) {
                req.params = schema.params.parse(req.params) as typeof req.params;
            }
            if (schema.query) {
                req.query = schema.query.parse(req.query) as typeof req.query;
            }
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const details = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                    code: e.code,
                }));
                throw new ValidationError(
                    details.map((d) => `${d.field}: ${d.message}`).join('; '),
                    details
                );
            }
            throw err;
        }
    };
}

/**
 * Shorthand: validate only the request body.
 */
export function validateBody(schema: ZodSchema) {
    return validate({ body: schema });
}

export default validate;
