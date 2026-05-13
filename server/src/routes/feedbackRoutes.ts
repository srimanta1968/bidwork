import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { submitFeedbackHandler } from '../controllers/feedbackController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.post('/', authenticate, wrap(submitFeedbackHandler));

export default router;
