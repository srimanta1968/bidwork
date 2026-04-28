import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { presignUpload, createProject, confirmMedia, getMyProjects, getProject, getProjectStatus, approveProject, retryProject, getAvailableProjects, getDraftProject, updateDraftProject, deleteMedia, setTaskPrice, updateTask, toggleTaskVisibility, getProjectBidSummary, promoteNextShortlisted } from '../controllers/projectController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.post('/presign', authenticate, wrap(presignUpload));
router.post('/', authenticate, wrap(createProject));
router.post('/confirm-media', authenticate, wrap(confirmMedia));
router.get('/', authenticate, wrap(getMyProjects));
router.get('/available', authenticate, wrap(getAvailableProjects));
router.get('/:id', authenticate, wrap(getProject));
router.get('/:id/draft', authenticate, wrap(getDraftProject));
router.get('/:id/status', authenticate, wrap(getProjectStatus));
router.get('/:id/bid-summary', authenticate, wrap(getProjectBidSummary));
router.post('/:id/promote-next-shortlisted', authenticate, wrap(promoteNextShortlisted));
router.put('/:id', authenticate, wrap(updateDraftProject));
router.put('/:id/tasks/:taskId', authenticate, wrap(updateTask));
router.put('/:id/tasks/:taskId/price', authenticate, wrap(setTaskPrice));
router.patch('/:id/tasks/:taskId/visibility', authenticate, wrap(toggleTaskVisibility));
router.delete('/:id/media/:mediaId', authenticate, wrap(deleteMedia));
router.post('/:id/approve', authenticate, wrap(approveProject));
router.post('/:id/retry', authenticate, wrap(retryProject));

export default router;
