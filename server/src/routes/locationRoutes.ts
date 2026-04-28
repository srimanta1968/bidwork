import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { searchLocations, expandLocation, getByIds } from '../controllers/locationController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.get('/search', authenticate, wrap(searchLocations));
router.get('/by-ids', authenticate, wrap(getByIds));
router.get('/:id/zips', authenticate, wrap(expandLocation));

export default router;
