import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { bidService } from '../services/bidService';

export async function submitBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    if (req.user.role === 'homeowner') { res.status(403).json({ success: false, error: 'Homeowners cannot submit bids' }); return; }

    const { project_id, bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category } = req.body;
    if (!project_id || !bid_amount || !estimated_days) {
      res.status(400).json({ success: false, error: 'project_id, bid_amount, and estimated_days are required' }); return;
    }

    const bid = await bidService.submitBid(project_id, req.user.userId, { bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category });
    res.status(201).json({ success: true, data: { bid } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

export async function getProjectBids(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bids = await bidService.getBidsForProject(req.params.projectId);
    res.status(200).json({ success: true, data: { bids } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getMyBids(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bids = await bidService.getMyBids(req.user.userId);
    res.status(200).json({ success: true, data: { bids } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function acceptBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bid = await bidService.acceptBid(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { bid, message: 'Bid accepted. Contractor assigned.' } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

export async function rejectBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    await bidService.rejectBid(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { message: 'Bid rejected.' } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}
