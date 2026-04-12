import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyProfile, onboard, getCategories } from '../controllers/profileController';
import { AuthenticatedRequest } from '../types';

const router: Router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => getMyProfile(req as AuthenticatedRequest, res));
router.post('/onboard', authenticate, (req: Request, res: Response) => onboard(req as AuthenticatedRequest, res));
router.get('/categories', authenticate, (req: Request, res: Response) => getCategories(req as AuthenticatedRequest, res));

export default router;
