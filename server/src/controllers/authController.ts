import { Request, Response } from 'express';
import { authService } from '../services/authService';

/**
 * POST /api/auth/register
 * Register a new user with email, password, and role
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({ success: false, error: 'Email, password, and role are required' });
      return;
    }

    const validRoles = ['homeowner', 'contractor'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: 'Role must be homeowner or contractor' });
      return;
    }

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const user = await authService.createUser(email, password, role);
    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate a user with email and password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const result = await authService.authenticateUser(email, password);

    if (!result) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        token: result.token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
