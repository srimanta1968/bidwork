import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { dataService } from './dataService';
import { User, UserResponse, JwtPayload, VALID_ROLES } from '../types';

/**
 * Hash a plain-text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, config.bcryptRounds);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plain-text password with a bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password comparison error:', error);
    throw new Error('Failed to compare password');
  }
}

/**
 * Generate a JWT token for the given payload
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    return await dataService.queryOne<User>(
      'SELECT id, email, password_hash, first_name, last_name, phone, role, is_onboarded, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
  } catch (error) {
    console.error('Find user by email error:', error);
    throw new Error('Failed to find user by email');
  }
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  try {
    return await dataService.queryOne<User>(
      'SELECT id, email, password_hash, first_name, last_name, phone, role, is_onboarded, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
  } catch (error) {
    console.error('Find user by ID error:', error);
    throw new Error('Failed to find user by ID');
  }
}

/**
 * Create a new user and return user data (excluding password)
 */
export async function createUser(first_name: string, last_name: string, email: string, password: string, role: string): Promise<UserResponse> {
  try {
    const password_hash = await hashPassword(password);
    const needsOnboarding = role === 'homeowner';

    const user = await dataService.queryOne<User>(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_onboarded)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role, is_onboarded, created_at`,
      [first_name, last_name, email, password_hash, role, needsOnboarding]
    );

    if (!user) {
      throw new Error('Failed to create user');
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      is_onboarded: user.is_onboarded,
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

/**
 * Authenticate a user with email and password, return user data + token
 */
export async function authenticateUser(email: string, password: string): Promise<{ user: UserResponse; token: string } | null> {
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_onboarded: user.is_onboarded,
      },
      token,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate user');
  }
}

/**
 * Mark user as onboarded
 */
export async function markOnboarded(userId: string): Promise<void> {
  try {
    await dataService.query('UPDATE users SET is_onboarded = true, updated_at = NOW() WHERE id = $1', [userId]);
  } catch (error) {
    console.error('Mark onboarded error:', error);
    throw new Error('Failed to mark user as onboarded');
  }
}

export const authService = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  findUserByEmail,
  findUserById,
  createUser,
  authenticateUser,
  markOnboarded,
};
