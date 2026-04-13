import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { catalogService } from '../services/catalogService';

export async function getCatalogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const catalogs = await catalogService.getCatalogs(req.user.userId);
    res.status(200).json({ success: true, data: { catalogs } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function createCatalog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { job_category, name } = req.body;
    if (!job_category || !name) { res.status(400).json({ success: false, error: 'job_category and name required' }); return; }
    const catalog = await catalogService.createCatalog(req.user.userId, { job_category, name });
    res.status(201).json({ success: true, data: { catalog } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getCatalogItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const items = await catalogService.getCatalogItems(req.params.catalogId);
    res.status(200).json({ success: true, data: { items } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function addCatalogItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { name, brand, model, specifications, image_url, unit_price } = req.body;
    if (!name) { res.status(400).json({ success: false, error: 'name is required' }); return; }
    const item = await catalogService.addCatalogItem(req.params.catalogId, { name, brand, model, specifications, image_url, unit_price });
    res.status(201).json({ success: true, data: { item } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateCatalogItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const item = await catalogService.updateCatalogItem(req.params.itemId, req.body);
    if (!item) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    res.status(200).json({ success: true, data: { item } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function deleteCatalogItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const item = await catalogService.deleteCatalogItem(req.params.itemId);
    if (!item) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
