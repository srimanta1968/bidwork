import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { submitBid, getProjectBids, getMyBids, acceptBid, rejectBid } from '../controllers/bidController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.post('/', authenticate, wrap(submitBid));
router.get('/my-bids', authenticate, wrap(getMyBids));
router.get('/project/:projectId', authenticate, wrap(getProjectBids));
router.post('/:id/accept', authenticate, wrap(acceptBid));
router.post('/:id/reject', authenticate, wrap(rejectBid));

export default router;
