import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { presignUpload, createProject, confirmMedia, getMyProjects, getProject, getProjectStatus, approveProject, retryProject, getAvailableProjects } from '../controllers/projectController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.post('/presign', authenticate, wrap(presignUpload));
router.post('/', authenticate, wrap(createProject));
router.post('/confirm-media', authenticate, wrap(confirmMedia));
router.get('/', authenticate, wrap(getMyProjects));
router.get('/available', authenticate, wrap(getAvailableProjects));
router.get('/:id', authenticate, wrap(getProject));
router.get('/:id/status', authenticate, wrap(getProjectStatus));
router.post('/:id/approve', authenticate, wrap(approveProject));
router.post('/:id/retry', authenticate, wrap(retryProject));

export default router;
