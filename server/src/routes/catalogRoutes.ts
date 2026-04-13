import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getCatalogs, createCatalog, getCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem } from '../controllers/catalogController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.get('/', authenticate, wrap(getCatalogs));
router.post('/', authenticate, wrap(createCatalog));
router.get('/:catalogId/items', authenticate, wrap(getCatalogItems));
router.post('/:catalogId/items', authenticate, wrap(addCatalogItem));
router.put('/items/:itemId', authenticate, wrap(updateCatalogItem));
router.delete('/items/:itemId', authenticate, wrap(deleteCatalogItem));

export default router;
