import { biddingDb } from './domainDb';
import { projectDb } from './domainDb';

export async function submitBid(projectId: string, contractorId: string, data: { bid_amount: number; estimated_days: number; proposal_notes?: string; contractor_name?: string; contractor_category?: string }) {
  try {
    // Validate bid is within range
    const project = await projectDb.queryOne<{ bid_floor: number; bid_ceiling: number; is_listed: boolean; status: string }>(
      'SELECT bid_floor, bid_ceiling, is_listed, status FROM projects WHERE id = $1', [projectId]
    );
    if (!project) throw new Error('Project not found');
    if (!project.is_listed || project.status !== 'bidding') throw new Error('Project is not accepting bids');
    if (data.bid_amount < project.bid_floor || data.bid_amount > project.bid_ceiling) {
      throw new Error(`Bid must be between $${project.bid_floor} and $${project.bid_ceiling}`);
    }

    return await biddingDb.queryOne(
      `INSERT INTO bids (project_id, contractor_id, bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, contractorId, data.bid_amount, data.estimated_days, data.proposal_notes || null, data.contractor_name || null, data.contractor_category || null]
    );
  } catch (error: any) {
    if (error.code === '23505') throw new Error('You already have an active bid on this project');
    throw error;
  }
}

export async function getBidsForProject(projectId: string) {
  try { return await biddingDb.queryAll('SELECT * FROM bids WHERE project_id = $1 ORDER BY created_at DESC', [projectId]); }
  catch (error) { console.error('Get bids error:', error); throw error; }
}

export async function getMyBids(contractorId: string) {
  try { return await biddingDb.queryAll('SELECT * FROM bids WHERE contractor_id = $1 ORDER BY created_at DESC', [contractorId]); }
  catch (error) { console.error('Get my bids error:', error); throw error; }
}

export async function acceptBid(bidId: string, homeownerId: string) {
  try {
    // Get the bid
    const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string }>('SELECT id, project_id, contractor_id FROM bids WHERE id = $1', [bidId]);
    if (!bid) throw new Error('Bid not found');

    // Verify homeowner owns the project
    const project = await projectDb.queryOne<{ homeowner_id: string }>('SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]);
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    // Accept this bid
    await biddingDb.query("UPDATE bids SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1", [bidId]);

    // Reject all other bids
    await biddingDb.query("UPDATE bids SET status = 'rejected', rejected_at = NOW(), updated_at = NOW() WHERE project_id = $1 AND id != $2 AND status = 'pending'", [bid.project_id, bidId]);

    // Assign contractor to project
    await projectDb.query("UPDATE projects SET assigned_contractor_id = $2, status = 'assigned', is_listed = false, updated_at = NOW() WHERE id = $1", [bid.project_id, bid.contractor_id]);

    return bid;
  } catch (error) { console.error('Accept bid error:', error); throw error; }
}

export async function rejectBid(bidId: string, homeownerId: string) {
  try {
    const bid = await biddingDb.queryOne<{ project_id: string }>('SELECT project_id FROM bids WHERE id = $1', [bidId]);
    if (!bid) throw new Error('Bid not found');
    const project = await projectDb.queryOne<{ homeowner_id: string }>('SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]);
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');
    await biddingDb.query("UPDATE bids SET status = 'rejected', rejected_at = NOW(), updated_at = NOW() WHERE id = $1", [bidId]);
  } catch (error) { console.error('Reject bid error:', error); throw error; }
}

export async function addBidMaterials(bidId: string, materials: Array<{ task_id: string; catalog_item_id: string; quantity: number; unit_price: number }>) {
  try {
    const results = [];
    for (const m of materials) {
      const total = m.quantity * m.unit_price;
      const result = await biddingDb.queryOne(
        `INSERT INTO bid_materials (bid_id, task_id, catalog_item_id, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [bidId, m.task_id, m.catalog_item_id, m.quantity, m.unit_price, total]
      );
      results.push(result);
    }
    return results;
  } catch (error) { console.error('Add bid materials error:', error); throw error; }
}

export async function getBidMaterials(bidId: string) {
  try {
    return await biddingDb.queryAll(
      'SELECT * FROM bid_materials WHERE bid_id = $1 ORDER BY created_at',
      [bidId]
    );
  } catch (error) { console.error('Get bid materials error:', error); throw error; }
}

export const bidService = { submitBid, getBidsForProject, getMyBids, acceptBid, rejectBid, addBidMaterials, getBidMaterials };
