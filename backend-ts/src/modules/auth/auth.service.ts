import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../../models/user.model.js';
import { AuthenticationError, ConflictError, NotFoundError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

const BCRYPT_ROUNDS = 12;

interface TokenPayload {
    user: { id: string };
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult {
    accessToken: string;  // short-lived access token
    refreshToken: string; // refresh token
    user: {
        id: string;
        name: string;
        email: string;
    };
}

/**
 * Generate access + refresh token pair
 */
function generateTokenPair(userId: string): AuthTokens {
    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!secret || !refreshSecret) throw new Error('JWT secrets not configured');

    const accessToken = jwt.sign(
        { user: { id: userId } } satisfies TokenPayload,
        secret,
        { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
    );

    const refreshToken = jwt.sign(
        { user: { id: userId } } satisfies TokenPayload,
        refreshSecret,
        { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
    );

    return { accessToken, refreshToken };
}

/**
 * Register a new user account
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
    // Check if user already exists
    const existing = await User.findOne({ email: input.email });
    if (existing) {
        throw new ConflictError('User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    // Create user
    const user = new User({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        isRegistered: true,
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user.id);

    // Store refresh token
    await User.findByIdAndUpdate(user.id, { refreshToken });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    };
}

/**
 * Login with email + password
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
    // Find user
    const user = await User.findOne({ email: input.email });
    if (!user || !user.password) {
        throw new AuthenticationError('Invalid credentials', 'AUTH_REQUIRED');
    }

    // Check password
    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
        throw new AuthenticationError('Invalid credentials', 'AUTH_REQUIRED');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user.id);

    // Store refresh token
    await User.findByIdAndUpdate(user.id, { refreshToken });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET not configured');

    try {
        const decoded = jwt.verify(refreshToken, refreshSecret) as TokenPayload;
        const user = await User.findById(decoded.user.id).select('+refreshToken');

        if (!user || user.refreshToken !== refreshToken) {
            throw new AuthenticationError('Invalid refresh token', 'TOKEN_INVALID');
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET not configured');

        const accessToken = jwt.sign(
            { user: { id: user.id } } satisfies TokenPayload,
            secret,
            { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
        );

        return { accessToken };
    } catch (err) {
        if (err instanceof AuthenticationError) throw err;
        throw new AuthenticationError('Invalid refresh token', 'TOKEN_INVALID');
    }
}

/**
 * Invalidate refresh token (logout)
 */
export async function logoutUser(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
}

/**
 * Get current user by ID
 */
export async function getCurrentUser(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
        throw new NotFoundError('User');
    }
    return user;
}
