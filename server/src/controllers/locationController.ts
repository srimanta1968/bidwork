import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { locationService } from '../services/locationService';

const ALLOWED_LEVELS = new Set(['state', 'metro', 'county', 'city', 'zip']);

/**
 * GET /api/locations/search?q&level&limit — fuzzy autocomplete via pg_trgm.
 */
export async function searchLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const q = (req.query.q as string) || '';
    if (q.trim().length < 2) { res.status(200).json({ success: true, data: { results: [] } }); return; }
    const level = req.query.level as string | undefined;
    if (level && !ALLOWED_LEVELS.has(level)) { res.status(400).json({ success: false, error: 'Invalid level' }); return; }
    const limit = parseInt(req.query.limit as string) || 20;
    const results = await locationService.searchLocations({ q, level, limit });
    res.status(200).json({ success: true, data: { results } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * GET /api/locations/:id/zips — expansion helper (debugging + admin).
 */
export async function expandLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const zips = await locationService.expandLocationToZips(req.params.id);
    res.status(200).json({ success: true, data: { zips, count: zips.length } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * GET /api/locations/by-ids?ids=uuid1,uuid2,... — batch hydrate saved locations
 * for the contractor service-area picker on profile load.
 */
export async function getByIds(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const idsParam = (req.query.ids as string) || '';
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) { res.status(200).json({ success: true, data: { locations: [] } }); return; }
    const locations = await locationService.getLocationsByIds(ids);
    res.status(200).json({ success: true, data: { locations } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
