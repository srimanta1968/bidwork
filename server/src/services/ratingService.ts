import { biddingDb, projectDb, authDb } from './domainDb';
import { isBidVisibleTo } from './bidService';

/**
 * Contractor reputation lifecycle (FT- contractor-ratings):
 *   - After receipt is issued, the contractor calls requestRating to insert a
 *     row with status='requested' and notify the homeowner.
 *   - The homeowner submits a 1-5 rating + optional review_text.
 *   - getContractorReputation aggregates avg/count + completed jobs +
 *     abandonment counter for surfacing on bid cards.
 */

export async function requestRating(bidId: string, contractorId: string) {
  const v = await isBidVisibleTo(bidId, contractorId);
  if (!v.allowed || !v.isContractor) throw new Error('Not authorized');
  const bid = await biddingDb.queryOne<{ contractor_id: string; project_id: string; selection_workflow_state: string }>(
    'SELECT contractor_id, project_id, selection_workflow_state FROM bids WHERE id = $1', [bidId]
  );
  if (!bid) throw new Error('Bid not found');
  if (!['receipt_issued','payment_received'].includes(bid.selection_workflow_state)) {
    throw new Error('Ratings can be requested only after the receipt is issued');
  }
  const project = await projectDb.queryOne<{ homeowner_id: string; title: string }>(
    'SELECT homeowner_id, title FROM projects WHERE id = $1', [bid.project_id]
  );
  if (!project) throw new Error('Project not found');
  const inserted = await biddingDb.queryOne<any>(
    `INSERT INTO contractor_ratings (bid_id, contractor_id, owner_id, status)
     VALUES ($1, $2, $3, 'requested')
     ON CONFLICT (bid_id) DO NOTHING
     RETURNING *`,
    [bidId, bid.contractor_id, project.homeowner_id]
  );
  // Email the homeowner asking for the rating (idempotent — only on first insert).
  if (inserted) {
    const owner = await authDb.queryOne<{ email: string; first_name: string | null }>(
      `SELECT email, first_name FROM users WHERE id = $1`, [project.homeowner_id]
    );
    if (owner?.email) {
      await biddingDb.query(
        `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
         VALUES ('rating_requested', $1, $2, $3, 'queued')`,
        [
          owner.email,
          `Please rate your contractor for "${project.title}"`,
          `<p>Hi ${owner.first_name || 'there'},</p><p>Your contractor has requested a rating for the completed work on <strong>${project.title}</strong>. Please log in to BidWork and rate the contractor on a scale of 1-5 stars. Your rating helps other homeowners pick the right contractor.</p>`,
        ]
      );
    }
  }
  return await getRatingForBid(bidId, contractorId);
}

export async function submitRating(bidId: string, ownerId: string, rating: number, reviewText: string | null) {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) throw new Error('rating must be an integer between 1 and 5');
  const v = await isBidVisibleTo(bidId, ownerId);
  if (!v.allowed || !v.isOwner) throw new Error('Not authorized');
  const cur = await biddingDb.queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM contractor_ratings WHERE bid_id = $1', [bidId]
  );
  if (!cur) throw new Error('Rating has not been requested for this workorder');
  if (cur.status === 'submitted') throw new Error('You have already rated this workorder');
  await biddingDb.query(
    `UPDATE contractor_ratings SET rating = $2, review_text = $3, status = 'submitted', rated_at = NOW()
      WHERE id = $1`,
    [cur.id, rating, reviewText]
  );
  return await getRatingForBid(bidId, ownerId);
}

export async function getRatingForBid(bidId: string, viewerUserId: string) {
  const v = await isBidVisibleTo(bidId, viewerUserId);
  if (!v.allowed) throw new Error('Not authorized');
  return await biddingDb.queryOne<any>('SELECT * FROM contractor_ratings WHERE bid_id = $1', [bidId]);
}

export async function getContractorReputation(contractorId: string) {
  const ratingRow = await biddingDb.queryOne<{ avg_rating: string | null; rating_count: string }>(
    `SELECT AVG(rating)::numeric(10,2) AS avg_rating, COUNT(*)::int AS rating_count
       FROM contractor_ratings WHERE contractor_id = $1 AND status = 'submitted'`,
    [contractorId]
  );
  const completedRow = await biddingDb.queryOne<{ completed: string }>(
    `SELECT COUNT(*)::int AS completed FROM bids
       WHERE contractor_id = $1
         AND selection_workflow_state IN ('receipt_issued','payment_received')`,
    [contractorId]
  );
  const profile = await authDb.queryOne<{ abandonment_flag_count: number; last_abandoned_at: string | null }>(
    `SELECT abandonment_flag_count, last_abandoned_at FROM contractor_profiles WHERE user_id = $1`,
    [contractorId]
  );
  return {
    contractor_id: contractorId,
    avg_rating: ratingRow?.avg_rating ? Number(ratingRow.avg_rating) : null,
    rating_count: Number(ratingRow?.rating_count || 0),
    completed_jobs: Number(completedRow?.completed || 0),
    abandonment_flag_count: Number(profile?.abandonment_flag_count || 0),
    last_abandoned_at: profile?.last_abandoned_at || null,
  };
}

export const ratingService = { requestRating, submitRating, getRatingForBid, getContractorReputation };
