// Custom error classes for consistent API error handling
// All errors extend AppError and include a machine-readable code

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown[];

    constructor(message: string, statusCode: number, code: string, details?: unknown[]) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown[]) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required', code: string = 'AUTH_REQUIRED') {
        super(message, 401, code);
    }
}

export class TokenExpiredError extends AppError {
    constructor() {
        super('Token has expired', 401, 'TOKEN_EXPIRED');
    }
}

export class TokenInvalidError extends AppError {
    constructor() {
        super('Token is not valid', 401, 'TOKEN_INVALID');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`);
    }
}

export class NotGroupMemberError extends AppError {
    constructor() {
        super('You are not a member of this group', 403, 'NOT_GROUP_MEMBER');
    }
}

export class SplitSumMismatchError extends AppError {
    constructor(expected: number, actual: number) {
        super(
            `Split amounts sum to ${actual} but total is ${expected}`,
            400,
            'SPLIT_SUM_MISMATCH',
            [{ expected, actual }]
        );
    }
}

export class InvalidSplitTypeError extends AppError {
    constructor(splitType: string) {
        super(`Invalid split type: ${splitType}`, 400, 'INVALID_SPLIT_TYPE');
    }
}

export class RateLimitError extends AppError {
    constructor() {
        super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }
}

export class AIServiceError extends AppError {
    constructor(message: string = 'AI service is temporarily unavailable', code: string = 'AI_SERVICE_UNAVAILABLE') {
        super(message, 503, code);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

// Error code constants for reference
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    EXPENSE_NOT_FOUND: 'EXPENSE_NOT_FOUND',
    SETTLEMENT_NOT_FOUND: 'SETTLEMENT_NOT_FOUND',
    NOT_GROUP_MEMBER: 'NOT_GROUP_MEMBER',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMITED: 'RATE_LIMITED',
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    SPLIT_SUM_MISMATCH: 'SPLIT_SUM_MISMATCH',
    INVALID_SPLIT_TYPE: 'INVALID_SPLIT_TYPE',
    CONFLICT: 'CONFLICT',
    SERVER_ERROR: 'SERVER_ERROR',
} as const;
