import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyProfile, onboard, getCategories, updateServingAreas, updateProfile, getBillingProfile, updateBillingProfile, presignSignatureUpload } from '../controllers/profileController';
import { AuthenticatedRequest } from '../types';

const router: Router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => getMyProfile(req as AuthenticatedRequest, res));
router.post('/onboard', authenticate, (req: Request, res: Response) => onboard(req as AuthenticatedRequest, res));
router.get('/categories', authenticate, (req: Request, res: Response) => getCategories(req as AuthenticatedRequest, res));
router.put('/update', authenticate, (req: Request, res: Response) => updateProfile(req as AuthenticatedRequest, res));
router.put('/serving-areas', authenticate, (req: Request, res: Response) => updateServingAreas(req as AuthenticatedRequest, res));
router.get('/billing', authenticate, (req: Request, res: Response) => getBillingProfile(req as AuthenticatedRequest, res));
router.put('/billing', authenticate, (req: Request, res: Response) => updateBillingProfile(req as AuthenticatedRequest, res));
router.post('/billing/signature/presign', authenticate, (req: Request, res: Response) => presignSignatureUpload(req as AuthenticatedRequest, res));

export default router;
