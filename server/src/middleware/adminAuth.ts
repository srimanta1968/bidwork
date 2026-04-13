import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Admin-only middleware. Must be used AFTER authenticate middleware.
 * Checks that the authenticated user has the 'admin' role.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access only' });
      return;
    }

    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Admin access only' });
  }
}
