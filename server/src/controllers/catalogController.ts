import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { catalogService } from '../services/catalogService';
import { s3Service } from '../services/s3Service';

const CATALOG_IMAGE_MIME_ALLOW = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

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

/**
 * POST /api/catalogs/items/:itemId/image/presign
 * Body: {filename, content_type}. Returns S3 presigned PUT URL for the contractor
 * to upload directly. Caller must own the catalog containing the item.
 */
export async function presignCatalogItemImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { filename, content_type } = req.body;
    if (!filename || !content_type) { res.status(400).json({ success: false, error: 'filename and content_type required' }); return; }
    if (!CATALOG_IMAGE_MIME_ALLOW.includes(content_type)) {
      res.status(400).json({ success: false, error: 'Image must be PNG, JPEG, or WEBP' }); return;
    }
    const owns = await catalogService.isCatalogItemOwnedBy(req.params.itemId, req.user.userId);
    if (!owns) { res.status(403).json({ success: false, error: 'Not your catalog item' }); return; }
    const s3_key = s3Service.generateCatalogItemKey(req.params.itemId, filename);
    const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3_key, content_type);
    res.status(200).json({ success: true, data: { s3_key, upload_url: url, expires_in: expiresIn } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
