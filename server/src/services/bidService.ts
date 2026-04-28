import { biddingDb, projectDb, authDb } from './domainDb';
import { emailService } from './emailService';

export interface TaskBreakdownInput {
  task_id: string;
  labor_cost: number;
  notes?: string;
}

interface ScopeTaskFloorRow {
  id: string;
  effective_start_price: string | number | null;
}

async function loadEffectiveTaskFloors(projectId: string): Promise<Map<string, number>> {
  const rows = await projectDb.queryAll<ScopeTaskFloorRow>(
    `SELECT id, COALESCE(owner_start_price, cost_min) AS effective_start_price
     FROM scope_tasks
     WHERE project_id = $1 AND is_removed = false`,
    [projectId]
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.id, Number(r.effective_start_price ?? 0));
  return map;
}

export async function submitBid(
  projectId: string,
  contractorId: string,
  data: {
    bid_amount?: number;
    estimated_days: number;
    proposal_notes?: string;
    contractor_name?: string;
    contractor_category?: string;
    task_breakdown?: TaskBreakdownInput[];
  }
) {
  try {
    const project = await projectDb.queryOne<{ bid_floor: number; bid_ceiling: number; is_listed: boolean; status: string }>(
      'SELECT bid_floor, bid_ceiling, is_listed, status FROM projects WHERE id = $1', [projectId]
    );
    if (!project) throw new Error('Project not found');
    if (!project.is_listed || project.status !== 'bidding') throw new Error('Project is not accepting bids');

    let resolvedBidAmount: number;

    if (data.task_breakdown && data.task_breakdown.length > 0) {
      // Per-task path: validate each line against the task's effective start price floor
      const floors = await loadEffectiveTaskFloors(projectId);
      let total = 0;
      for (const line of data.task_breakdown) {
        if (!floors.has(line.task_id)) {
          throw new Error(`Task ${line.task_id} does not belong to this project`);
        }
        if (line.labor_cost < 0) throw new Error('labor_cost must be >= 0');
        // Materials subtotal is computed from bid_materials after insert; for floor
        // validation the labor portion alone must already cover the per-task floor.
        const floor = floors.get(line.task_id) ?? 0;
        if (line.labor_cost < floor) {
          throw new Error(`Labor cost for task ${line.task_id} ($${line.labor_cost}) is below the start price floor ($${floor})`);
        }
        total += Number(line.labor_cost);
      }
      resolvedBidAmount = total;
    } else {
      // Legacy path: single bid_amount validated against project floor/ceiling
      if (data.bid_amount === undefined || data.bid_amount === null) {
        throw new Error('Either task_breakdown or bid_amount is required');
      }
      if (data.bid_amount < project.bid_floor || data.bid_amount > project.bid_ceiling) {
        throw new Error(`Bid must be between $${project.bid_floor} and $${project.bid_ceiling}`);
      }
      resolvedBidAmount = data.bid_amount;
    }

    const bid = await biddingDb.queryOne<any>(
      `INSERT INTO bids (project_id, contractor_id, bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, contractorId, resolvedBidAmount, data.estimated_days, data.proposal_notes || null, data.contractor_name || null, data.contractor_category || null]
    );

    if (data.task_breakdown && data.task_breakdown.length > 0 && bid) {
      await upsertBidTaskBreakdown(bid.id, data.task_breakdown);
    }

    return bid;
  } catch (error: any) {
    if (error.code === '23505') throw new Error('You already have an active bid on this project');
    throw error;
  }
}

export async function getBidsForProject(projectId: string) {
  try {
    const bids = await biddingDb.queryAll<any>('SELECT * FROM bids WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    if (bids.length === 0) return bids;
    const contractorIds = Array.from(new Set(bids.map(b => b.contractor_id)));
    const profiles = await authDb.queryAll<any>(
      `SELECT user_id, abandonment_flag_count, last_abandoned_at FROM contractor_profiles WHERE user_id = ANY($1::uuid[])`,
      [contractorIds]
    );
    const flagsByUser = new Map(profiles.map(p => [p.user_id, p]));
    // Contractor reputation: rating aggregate + completed-job count.
    const ratingRows = await biddingDb.queryAll<{ contractor_id: string; avg_rating: string | null; rating_count: string }>(
      `SELECT contractor_id, AVG(rating)::numeric(10,2) AS avg_rating, COUNT(*)::int AS rating_count
         FROM contractor_ratings
        WHERE status = 'submitted' AND contractor_id = ANY($1::uuid[])
        GROUP BY contractor_id`,
      [contractorIds]
    );
    const ratingsByUser = new Map(ratingRows.map(r => [r.contractor_id, r]));
    const completedRows = await biddingDb.queryAll<{ contractor_id: string; completed: string }>(
      `SELECT contractor_id, COUNT(*)::int AS completed FROM bids
        WHERE contractor_id = ANY($1::uuid[])
          AND selection_workflow_state IN ('receipt_issued','payment_received')
        GROUP BY contractor_id`,
      [contractorIds]
    );
    const completedByUser = new Map(completedRows.map(r => [r.contractor_id, Number(r.completed)]));
    return bids.map(b => ({
      ...b,
      abandonment_flag_count: Number(flagsByUser.get(b.contractor_id)?.abandonment_flag_count || 0),
      last_abandoned_at: flagsByUser.get(b.contractor_id)?.last_abandoned_at || null,
      avg_rating: ratingsByUser.get(b.contractor_id)?.avg_rating ? Number(ratingsByUser.get(b.contractor_id)!.avg_rating) : null,
      rating_count: Number(ratingsByUser.get(b.contractor_id)?.rating_count || 0),
      completed_jobs: completedByUser.get(b.contractor_id) || 0,
    }));
  } catch (error) { console.error('Get bids error:', error); throw error; }
}

export async function getMyBids(contractorId: string) {
  try {
    const bids = await biddingDb.queryAll<any>(
      'SELECT * FROM bids WHERE contractor_id = $1 ORDER BY created_at DESC', [contractorId]
    );
    if (bids.length === 0) return bids;
    const projectIds = Array.from(new Set(bids.map(b => b.project_id)));
    const projects = await projectDb.queryAll<{ id: string; title: string; description: string | null; category: string | null; city: string | null; zip_code: string | null }>(
      `SELECT id, title, description, category, city, zip_code FROM projects WHERE id = ANY($1::uuid[])`,
      [projectIds]
    );
    const projById = new Map(projects.map(p => [p.id, p]));
    return bids.map(b => ({
      ...b,
      project_title: projById.get(b.project_id)?.title || null,
      project_description: projById.get(b.project_id)?.description || null,
      project_category: projById.get(b.project_id)?.category || null,
      project_city: projById.get(b.project_id)?.city || null,
      project_zip: projById.get(b.project_id)?.zip_code || null,
    }));
  } catch (error) { console.error('Get my bids error:', error); throw error; }
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

export async function rejectBid(bidId: string, homeownerId: string, reason?: string) {
  try {
    const bid = await biddingDb.queryOne<{ project_id: string }>('SELECT project_id FROM bids WHERE id = $1', [bidId]);
    if (!bid) throw new Error('Bid not found');
    const project = await projectDb.queryOne<{ homeowner_id: string }>('SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]);
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');
    if (!reason || reason.trim().length < 10) {
      throw new Error('A rejection reason of at least 10 characters is required');
    }
    await biddingDb.query(
      `UPDATE bids SET status = 'rejected', rejected_at = NOW(),
                       rejection_reason = $2, status_updated_at = NOW(), status_updated_by = $3,
                       updated_at = NOW()
        WHERE id = $1`,
      [bidId, reason.trim(), homeownerId]
    );
  } catch (error) { console.error('Reject bid error:', error); throw error; }
}

const ALLOWED_WORKFLOW_STATES = new Set(['pending','shortlisted','approved_by_owner','offer_accepted','rejected','withdrawn','abandoned']);

export async function updateBidStatus(bidId: string, homeownerId: string, status: string, rejectionReason?: string) {
  try {
    if (!ALLOWED_WORKFLOW_STATES.has(status)) throw new Error(`Unsupported status "${status}"`);
    const bid = await biddingDb.queryOne<{ project_id: string; selection_workflow_state: string }>(
      'SELECT project_id, selection_workflow_state FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    const project = await projectDb.queryOne<{ homeowner_id: string }>(
      'SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]
    );
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    if (status === 'rejected') {
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new Error('A rejection reason of at least 10 characters is required');
      }
      await biddingDb.query(
        `UPDATE bids
            SET status = 'rejected',
                selection_workflow_state = 'rejected',
                rejection_reason = $2,
                rejected_at = NOW(),
                status_updated_at = NOW(),
                status_updated_by = $3,
                updated_at = NOW()
          WHERE id = $1`,
        [bidId, rejectionReason.trim(), homeownerId]
      );
    } else {
      await biddingDb.query(
        `UPDATE bids
            SET selection_workflow_state = $2,
                status_updated_at = NOW(),
                status_updated_by = $3,
                updated_at = NOW()
          WHERE id = $1`,
        [bidId, status, homeownerId]
      );
    }
    return await biddingDb.queryOne('SELECT * FROM bids WHERE id = $1', [bidId]);
  } catch (error) { console.error('Update bid status error:', error); throw error; }
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
    // Keep per-task materials_subtotal in sync with bid_materials
    await recomputeMaterialsSubtotalForBid(bidId);
    return results;
  } catch (error) { console.error('Add bid materials error:', error); throw error; }
}

export async function getBidMaterials(bidId: string) {
  try {
    // Cross-schema join: bid_materials lives in bidding, catalog_items in catalog.
    // Both pools point at the same database today, so a fully-qualified join works.
    const rows = await biddingDb.queryAll<any>(
      `SELECT bm.*,
              ci.name AS item_name, ci.brand AS item_brand, ci.model AS item_model,
              ci.specifications AS item_specifications, ci.image_url AS item_image_url,
              ci.unit_price AS item_unit_price
         FROM bid_materials bm
         LEFT JOIN catalog.catalog_items ci ON ci.id = bm.catalog_item_id
        WHERE bm.bid_id = $1
        ORDER BY bm.created_at`,
      [bidId]
    );
    const { s3Service } = await import('./s3Service');
    return await Promise.all(rows.map(async r => ({
      ...r,
      catalog_item: {
        id: r.catalog_item_id,
        name: r.item_name,
        brand: r.item_brand,
        model: r.item_model,
        specifications: r.item_specifications,
        image_url: r.item_image_url,
        image_download_url: await s3Service.resolveImageUrl(r.item_image_url),
        unit_price: r.item_unit_price,
      },
    })));
  } catch (error) { console.error('Get bid materials error:', error); throw error; }
}

export async function upsertBidTaskBreakdown(bidId: string, breakdown: TaskBreakdownInput[]) {
  try {
    for (const line of breakdown) {
      await biddingDb.query(
        `INSERT INTO bid_task_breakdown (bid_id, task_id, labor_cost, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (bid_id, task_id) DO UPDATE
         SET labor_cost = EXCLUDED.labor_cost,
             notes = EXCLUDED.notes,
             updated_at = NOW()`,
        [bidId, line.task_id, line.labor_cost, line.notes || null]
      );
    }
    await recomputeMaterialsSubtotalForBid(bidId);
    await recomputeBidAmountFromBreakdown(bidId);
  } catch (error) { console.error('Upsert bid task breakdown error:', error); throw error; }
}

export async function recomputeMaterialsSubtotalForBid(bidId: string) {
  try {
    // Update existing breakdown rows whose task_id has materials. Insert is unnecessary here:
    // breakdown rows are created via upsertBidTaskBreakdown when the contractor edits labor.
    await biddingDb.query(
      `UPDATE bid_task_breakdown btb
         SET materials_subtotal = COALESCE(sub.total, 0),
             updated_at = NOW()
       FROM (
         SELECT task_id, SUM(total) AS total
         FROM bid_materials
         WHERE bid_id = $1
         GROUP BY task_id
       ) sub
       WHERE btb.bid_id = $1 AND btb.task_id = sub.task_id`,
      [bidId]
    );
  } catch (error) { console.error('Recompute materials subtotal error:', error); throw error; }
}

export async function recomputeBidAmountFromBreakdown(bidId: string) {
  try {
    await biddingDb.query(
      `UPDATE bids SET bid_amount = COALESCE(
         (SELECT SUM(line_total) FROM bid_task_breakdown WHERE bid_id = $1), bid_amount
       ), updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
  } catch (error) { console.error('Recompute bid amount error:', error); throw error; }
}

export async function getBidTaskBreakdown(bidId: string) {
  try {
    const rows = await biddingDb.queryAll<any>(
      `SELECT id, bid_id, task_id, labor_cost, materials_subtotal, line_total, notes, created_at, updated_at
         FROM bid_task_breakdown WHERE bid_id = $1 ORDER BY created_at`,
      [bidId]
    );
    if (rows.length === 0) return rows;
    const taskIds = rows.map(r => r.task_id);
    const tasks = await projectDb.queryAll<{ id: string; title: string; description: string | null }>(
      `SELECT id, title, description FROM scope_tasks WHERE id = ANY($1::uuid[])`, [taskIds]
    );
    const titles = new Map(tasks.map(t => [t.id, t]));
    return rows.map(r => ({
      ...r,
      task_title: titles.get(r.task_id)?.title || null,
      task_description: titles.get(r.task_id)?.description || null,
    }));
  } catch (error) { console.error('Get bid breakdown error:', error); throw error; }
}

export async function getBidWithBreakdown(bidId: string) {
  try {
    const bid = await biddingDb.queryOne<any>('SELECT * FROM bids WHERE id = $1', [bidId]);
    if (!bid) return null;
    const breakdown = await getBidTaskBreakdown(bidId);
    const materials = await getBidMaterials(bidId);
    // Nest materials under their task line
    const linesByTask: Record<string, any> = {};
    for (const line of breakdown as any[]) {
      linesByTask[line.task_id] = { ...line, materials: [] };
    }
    for (const m of materials as any[]) {
      if (linesByTask[m.task_id]) linesByTask[m.task_id].materials.push(m);
    }
    return { ...bid, task_breakdown: Object.values(linesByTask) };
  } catch (error) { console.error('Get bid with breakdown error:', error); throw error; }
}

export async function updateBid(
  bidId: string,
  contractorId: string,
  data: {
    estimated_days?: number;
    proposal_notes?: string;
    task_breakdown?: TaskBreakdownInput[];
  }
) {
  try {
    const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string; status: string }>(
      'SELECT id, project_id, contractor_id, status FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    if (bid.contractor_id !== contractorId) throw new Error('Not authorized');
    if (bid.status !== 'pending') throw new Error('Only pending bids can be edited');

    if (data.task_breakdown) {
      const floors = await loadEffectiveTaskFloors(bid.project_id);
      for (const line of data.task_breakdown) {
        if (!floors.has(line.task_id)) throw new Error(`Task ${line.task_id} does not belong to this project`);
        if (line.labor_cost < 0) throw new Error('labor_cost must be >= 0');
        const floor = floors.get(line.task_id) ?? 0;
        if (line.labor_cost < floor) {
          throw new Error(`Labor cost for task ${line.task_id} ($${line.labor_cost}) is below the start price floor ($${floor})`);
        }
      }
      await upsertBidTaskBreakdown(bidId, data.task_breakdown);
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.estimated_days !== undefined) { fields.push(`estimated_days = $${idx++}`); values.push(data.estimated_days); }
    if (data.proposal_notes !== undefined) { fields.push(`proposal_notes = $${idx++}`); values.push(data.proposal_notes); }
    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(bidId);
      await biddingDb.query(`UPDATE bids SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    return await getBidWithBreakdown(bidId);
  } catch (error) { console.error('Update bid error:', error); throw error; }
}

// ── Payment Transaction Records (contractor-uploaded proof of payment) ──

export interface PaymentTransactionRecordInput {
  payment_method: string;
  transaction_reference: string;
  transaction_date: string; // YYYY-MM-DD
  transaction_amount_cents: number;
  proof_doc_s3_key: string;
  proof_mime_type?: string;
  proof_size_bytes?: number;
  contractor_notes?: string;
}

const ALLOWED_PAYMENT_METHODS = new Set([
  'stripe','paypal','bank_transfer','wire','check','cash','zelle','venmo','crypto','other',
]);

export async function recordPaymentTransaction(bidId: string, contractorId: string, input: PaymentTransactionRecordInput) {
  try {
    if (!ALLOWED_PAYMENT_METHODS.has(input.payment_method)) {
      throw new Error(`Unsupported payment_method "${input.payment_method}"`);
    }
    if (!input.transaction_reference?.trim()) throw new Error('transaction_reference is required');
    if (!input.transaction_date) throw new Error('transaction_date is required');
    if (!Number.isInteger(input.transaction_amount_cents) || input.transaction_amount_cents <= 0) {
      throw new Error('transaction_amount_cents must be a positive integer');
    }
    if (!input.proof_doc_s3_key) throw new Error('proof_doc_s3_key is required');

    return await biddingDb.queryOne(
      `INSERT INTO payment_transaction_records (
         bid_id, contractor_id, payment_method, transaction_reference, transaction_date,
         transaction_amount_cents, proof_doc_s3_key, proof_mime_type, proof_size_bytes, contractor_notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        bidId, contractorId, input.payment_method, input.transaction_reference.trim(), input.transaction_date,
        input.transaction_amount_cents, input.proof_doc_s3_key,
        input.proof_mime_type || null, input.proof_size_bytes || null, input.contractor_notes || null,
      ]
    );
  } catch (error: any) {
    if (error.code === '23505') throw new Error('A payment transaction record already exists for this bid');
    console.error('Record payment transaction error:', error);
    throw error;
  }
}

export async function getPaymentTransactionByBid(bidId: string) {
  try {
    return await biddingDb.queryOne(
      'SELECT * FROM payment_transaction_records WHERE bid_id = $1', [bidId]
    );
  } catch (error) { console.error('Get payment transaction error:', error); throw error; }
}

export async function getBidGrandTotalCents(bidId: string): Promise<number> {
  try {
    // Prefer per-task line totals; fall back to bid_amount when no breakdown rows exist.
    const row = await biddingDb.queryOne<{ total_cents: string | null }>(
      `SELECT COALESCE(
                ROUND(SUM(line_total) * 100)::BIGINT,
                ROUND((SELECT bid_amount FROM bids WHERE id = $1) * 100)::BIGINT
              ) AS total_cents
         FROM bid_task_breakdown WHERE bid_id = $1`,
      [bidId]
    );
    const contractCents = Number(row?.total_cents ?? 0);
    // Accepted additional work rolls into the contractor's payment grand total
    // (recorded only — BidWork takes no fee on these line items).
    const awoCents = await getAcceptedAdditionalWorkTotalCents(bidId);
    return contractCents + awoCents;
  } catch (error) { console.error('Get bid grand total error:', error); throw error; }
}

// ── Additional Work Orders (recording-only — no BidWork fee on these) ──

export interface AdditionalWorkInput {
  title: string;
  description?: string;
  amount_cents: number;
  photo_evidence_keys?: string[];
}

async function loadBidWithProject(bidId: string) {
  const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string; status: string }>(
    'SELECT id, project_id, contractor_id, status FROM bids WHERE id = $1', [bidId]
  );
  if (!bid) return null;
  const project = await projectDb.queryOne<{ id: string; homeowner_id: string; status: string; assigned_contractor_id: string | null }>(
    'SELECT id, homeowner_id, status, assigned_contractor_id FROM projects WHERE id = $1', [bid.project_id]
  );
  return project ? { bid, project } : null;
}

export async function submitAdditionalWork(bidId: string, contractorId: string, input: AdditionalWorkInput) {
  try {
    if (!input.title?.trim()) throw new Error('title is required');
    if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) {
      throw new Error('amount_cents must be a positive integer');
    }

    const ctx = await loadBidWithProject(bidId);
    if (!ctx) throw new Error('Bid not found');
    if (ctx.bid.contractor_id !== contractorId) throw new Error('Not your bid');
    if (ctx.bid.status !== 'accepted') {
      throw new Error('Additional work can only be added on an accepted bid (active engagement)');
    }
    if (ctx.project.status === 'completed') {
      throw new Error('Project is already closed; additional work cannot be added');
    }

    return await biddingDb.queryOne(
      `INSERT INTO additional_work_orders (
         bid_id, contractor_id, title, description, amount_cents, photo_evidence_keys
       ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [bidId, contractorId, input.title.trim(), input.description?.trim() || null, input.amount_cents, input.photo_evidence_keys || []]
    );
  } catch (error) { console.error('Submit additional work error:', error); throw error; }
}

export async function acceptAdditionalWork(bidId: string, awoId: string, homeownerId: string, ownerSignatureTypedName: string, notes?: string) {
  try {
    if (!ownerSignatureTypedName?.trim()) throw new Error('owner_signature_typed_name is required to accept');
    const ctx = await loadBidWithProject(bidId);
    if (!ctx) throw new Error('Bid not found');
    if (ctx.project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    const updated = await biddingDb.queryOne(
      `UPDATE additional_work_orders
          SET owner_status = 'accepted',
              owner_signature_typed_name = $3,
              owner_response_notes = $4,
              owner_responded_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND bid_id = $2 AND owner_status = 'pending'
        RETURNING *`,
      [awoId, bidId, ownerSignatureTypedName.trim(), notes?.trim() || null]
    );
    if (!updated) throw new Error('Additional work not found or already responded');
    return updated;
  } catch (error) { console.error('Accept additional work error:', error); throw error; }
}

export async function rejectAdditionalWork(bidId: string, awoId: string, homeownerId: string, notes: string) {
  try {
    if (!notes?.trim()) throw new Error('owner_response_notes is required when rejecting');
    const ctx = await loadBidWithProject(bidId);
    if (!ctx) throw new Error('Bid not found');
    if (ctx.project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    const updated = await biddingDb.queryOne(
      `UPDATE additional_work_orders
          SET owner_status = 'rejected',
              owner_response_notes = $3,
              owner_responded_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND bid_id = $2 AND owner_status = 'pending'
        RETURNING *`,
      [awoId, bidId, notes.trim()]
    );
    if (!updated) throw new Error('Additional work not found or already responded');
    return updated;
  } catch (error) { console.error('Reject additional work error:', error); throw error; }
}

export async function listAdditionalWork(bidId: string, viewerUserId: string) {
  try {
    const ctx = await loadBidWithProject(bidId);
    if (!ctx) throw new Error('Bid not found');
    const isContractor = ctx.bid.contractor_id === viewerUserId;
    const isHomeowner = ctx.project.homeowner_id === viewerUserId;
    if (!isContractor && !isHomeowner) throw new Error('Not authorized');

    return await biddingDb.queryAll(
      'SELECT * FROM additional_work_orders WHERE bid_id = $1 ORDER BY contractor_submitted_at DESC',
      [bidId]
    );
  } catch (error) { console.error('List additional work error:', error); throw error; }
}

export async function getAcceptedAdditionalWorkTotalCents(bidId: string): Promise<number> {
  try {
    const row = await biddingDb.queryOne<{ total: string | null }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::BIGINT AS total
         FROM additional_work_orders WHERE bid_id = $1 AND owner_status = 'accepted'`,
      [bidId]
    );
    return Number(row?.total ?? 0);
  } catch (error) { console.error('Get additional work total error:', error); throw error; }
}

// ── Selection workflow: shortlist + Select & Notify ──

export const SELECT_NOTIFY_DEADLINE_HOURS = parseInt(process.env.SELECT_NOTIFY_ABANDON_HOURS || '72', 10);

export async function setShortlistRank(bidId: string, homeownerId: string, rank: number) {
  try {
    if (!Number.isInteger(rank) || rank < 1 || rank > 3) {
      throw new Error('rank must be 1, 2, or 3');
    }
    const bid = await biddingDb.queryOne<{ id: string; project_id: string; status: string }>(
      'SELECT id, project_id, status FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    if (bid.status !== 'pending') {
      throw new Error('Only pending bids can be shortlisted');
    }
    const project = await projectDb.queryOne<{ homeowner_id: string }>(
      'SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]
    );
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    // If another bid in this project already holds this rank, swap it off so the
    // unique partial index doesn't reject the update. The displaced bid drops to
    // unranked but stays selectable.
    await biddingDb.query(
      `UPDATE bids SET shortlist_rank = NULL, updated_at = NOW()
        WHERE project_id = $1 AND shortlist_rank = $2 AND id != $3`,
      [bid.project_id, rank, bidId]
    );

    return await biddingDb.queryOne(
      `UPDATE bids
          SET shortlist_rank = $2,
              selection_workflow_state = 'shortlisted',
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [bidId, rank]
    );
  } catch (error) { console.error('Set shortlist rank error:', error); throw error; }
}

export async function clearShortlistRank(bidId: string, homeownerId: string) {
  try {
    const bid = await biddingDb.queryOne<{ id: string; project_id: string }>(
      'SELECT id, project_id FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    const project = await projectDb.queryOne<{ homeowner_id: string }>(
      'SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]
    );
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    return await biddingDb.queryOne(
      `UPDATE bids
          SET shortlist_rank = NULL,
              selection_workflow_state = CASE WHEN selection_workflow_state = 'shortlisted' THEN 'pending' ELSE selection_workflow_state END,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [bidId]
    );
  } catch (error) { console.error('Clear shortlist rank error:', error); throw error; }
}

export async function selectAndNotify(bidId: string, homeownerId: string) {
  try {
    const bid = await biddingDb.queryOne<{
      id: string; project_id: string; contractor_id: string;
      bid_amount: string | number; shortlist_rank: number | null;
      selection_workflow_state: string; status: string;
    }>(
      `SELECT id, project_id, contractor_id, bid_amount, shortlist_rank, selection_workflow_state, status
         FROM bids WHERE id = $1`, [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    if (bid.shortlist_rank === null) throw new Error('Bid must be shortlisted before notifying');
    if (bid.status !== 'pending') throw new Error('Bid is no longer pending');
    if (!['pending', 'shortlisted'].includes(bid.selection_workflow_state)) {
      throw new Error('Bid is not in a state that can be notified');
    }

    const project = await projectDb.queryOne<{ homeowner_id: string; title: string }>(
      'SELECT homeowner_id, title FROM projects WHERE id = $1', [bid.project_id]
    );
    if (!project || project.homeowner_id !== homeownerId) throw new Error('Not authorized');

    // Only one bid in approved_by_owner state per project at a time
    const existingApproved = await biddingDb.queryOne<{ id: string }>(
      `SELECT id FROM bids
        WHERE project_id = $1 AND selection_workflow_state = 'approved_by_owner' AND id != $2`,
      [bid.project_id, bidId]
    );
    if (existingApproved) {
      throw new Error('Another bid on this project is already in the approval flow. Wait for it to abandon or complete before notifying a new contractor.');
    }

    const updated = await biddingDb.queryOne<any>(
      `UPDATE bids
          SET selection_workflow_state = 'approved_by_owner',
              approved_by_owner_at = NOW(),
              approval_notified_at = NOW(),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [bidId]
    );

    // Best-effort email + log; don't fail the transition if email is down.
    try {
      const contractor = await authDb.queryOne<{ email: string; first_name: string | null }>(
        'SELECT email, first_name FROM users WHERE id = $1', [bid.contractor_id]
      );
      if (contractor?.email) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        await emailService.sendSelectAndNotifyEmail({
          to: contractor.email,
          contractorFirstName: contractor.first_name || 'there',
          projectTitle: project.title,
          bidAmount: Number(bid.bid_amount),
          acceptDeadlineHours: SELECT_NOTIFY_DEADLINE_HOURS,
          acceptUrl: `${baseUrl}/dashboard?bid=${bidId}`,
        });
      }
    } catch (emailErr) {
      console.error('Select-notify email dispatch failed (non-fatal):', emailErr);
    }

    // Schedule the 24h reminder + 72h auto-abandon timers (in-process agent fires them).
    try {
      const { timerAgent } = await import('./workflow/timerAgent');
      await timerAgent.scheduleSelectNotifyTimers(bidId);
    } catch (err) {
      console.error('Timer scheduling failed (non-fatal):', err);
    }
    try {
      const { selectionStateMachine } = await import('./workflow/selectionStateMachine');
      await selectionStateMachine.recordTransition({
        entityId: bidId, stateFrom: 'shortlisted', stateTo: 'approved_by_owner',
        actorUserId: homeownerId, actorRole: 'homeowner',
        reason: 'select_notify',
      });
    } catch { /* audit failures are non-fatal */ }

    return updated;
  } catch (error) { console.error('Select and notify error:', error); throw error; }
}

export const bidService = {
  submitBid, getBidsForProject, getMyBids, acceptBid, rejectBid,
  addBidMaterials, getBidMaterials,
  upsertBidTaskBreakdown, recomputeMaterialsSubtotalForBid, recomputeBidAmountFromBreakdown,
  getBidTaskBreakdown, getBidWithBreakdown, updateBid,
  recordPaymentTransaction, getPaymentTransactionByBid, getBidGrandTotalCents,
  submitAdditionalWork, acceptAdditionalWork, rejectAdditionalWork, listAdditionalWork,
  getAcceptedAdditionalWorkTotalCents,
  setShortlistRank, clearShortlistRank, selectAndNotify, updateBidStatus,
  finalizeBidAttachment, listBidAttachments, deleteBidAttachment, isBidVisibleTo,
  postBidMessage, listBidMessages, markBidMessageRead,
  acceptOffer, getContractForBid, signContract,
  abandonOffer,
  proposeSchedule, approveSchedule, rejectSchedule,
};

// ── Schedule submission + approval ──

export async function proposeSchedule(bidId: string, contractorId: string, startDate: string, endDate: string) {
  try {
    if (!startDate || !endDate) throw new Error('start_date and end_date are required');
    const todayIso = new Date().toISOString().slice(0, 10);
    if (startDate < todayIso) throw new Error('start_date cannot be in the past');
    if (new Date(endDate) <= new Date(startDate)) throw new Error('end_date must be after start_date');
    const v = await isBidVisibleTo(bidId, contractorId);
    if (!v.allowed || !v.isContractor) throw new Error('Not authorized');
    const contract = await biddingDb.queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM contracts WHERE bid_id = $1', [bidId]
    );
    if (!contract) throw new Error('Contract not found — accept the offer first');
    if (contract.status !== 'executed') throw new Error('Both parties must sign the contract before submitting a schedule');
    await biddingDb.query(
      `UPDATE contracts SET proposed_start_date = $2, proposed_end_date = $3,
                              schedule_status = 'proposed', schedule_proposed_at = NOW()
        WHERE id = $1`,
      [contract.id, startDate, endDate]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'schedule_proposed', updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
    // Notify homeowner
    try {
      const owner = await biddingDb.queryOne<{ email: string; first_name: string | null; project_title: string }>(
        `SELECT u.email, u.first_name, p.title AS project_title
           FROM bids b JOIN projects.projects p ON p.id = b.project_id
           JOIN auth.users u ON u.id = p.homeowner_id
          WHERE b.id = $1`,
        [bidId]
      );
      if (owner?.email) {
        await biddingDb.query(
          `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
           VALUES ('schedule_proposed', $1, $2, $3, 'queued')`,
          [
            owner.email,
            `Contractor proposed a schedule for "${owner.project_title}"`,
            `<p>Hi ${owner.first_name || 'there'},</p><p>Your contractor has proposed a work schedule from <strong>${startDate}</strong> to <strong>${endDate}</strong> for the project <strong>${owner.project_title}</strong>. Please log in to BidWork to approve or request changes — your 5% deposit becomes due once the schedule is approved.</p>`,
          ]
        );
      }
    } catch (err) { console.error('Schedule-proposed email queue failed:', err); }
    return await getContractForBid(bidId, contractorId);
  } catch (error) { console.error('Propose schedule error:', error); throw error; }
}

export async function approveSchedule(bidId: string, homeownerId: string, ownerSignature?: string) {
  try {
    const v = await isBidVisibleTo(bidId, homeownerId);
    if (!v.allowed || !v.isOwner) throw new Error('Not authorized');
    const contract = await biddingDb.queryOne<{ id: string; schedule_status: string }>(
      'SELECT id, schedule_status FROM contracts WHERE bid_id = $1', [bidId]
    );
    if (!contract) throw new Error('Contract not found');
    if (contract.schedule_status !== 'proposed') throw new Error('No schedule pending approval');
    await biddingDb.query(
      `UPDATE contracts SET schedule_status = 'approved', schedule_responded_at = NOW(),
                              schedule_owner_signature = $2
        WHERE id = $1`,
      [contract.id, ownerSignature || null]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'schedule_approved', updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
    try {
      const contractor = await biddingDb.queryOne<{ email: string; first_name: string | null; project_title: string }>(
        `SELECT u.email, u.first_name, p.title AS project_title
           FROM bids b JOIN projects.projects p ON p.id = b.project_id
           JOIN auth.users u ON u.id = b.contractor_id
          WHERE b.id = $1`,
        [bidId]
      );
      if (contractor?.email) {
        await biddingDb.query(
          `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
           VALUES ('schedule_approved', $1, $2, $3, 'queued')`,
          [
            contractor.email,
            `Schedule approved for "${contractor.project_title}"`,
            `<p>Hi ${contractor.first_name || 'there'},</p><p>The homeowner has approved your proposed schedule. They will pay the 5% platform deposit next; once collected, addresses are revealed and you can begin work.</p>`,
          ]
        );
      }
    } catch (err) { console.error('Schedule-approved email queue failed:', err); }
    return await getContractForBid(bidId, homeownerId);
  } catch (error) { console.error('Approve schedule error:', error); throw error; }
}

export async function rejectSchedule(bidId: string, homeownerId: string, notes: string) {
  try {
    if (!notes || !notes.trim()) throw new Error('Reason for rejection is required');
    const v = await isBidVisibleTo(bidId, homeownerId);
    if (!v.allowed || !v.isOwner) throw new Error('Not authorized');
    const contract = await biddingDb.queryOne<{ id: string; schedule_status: string }>(
      'SELECT id, schedule_status FROM contracts WHERE bid_id = $1', [bidId]
    );
    if (!contract) throw new Error('Contract not found');
    if (contract.schedule_status !== 'proposed') throw new Error('No schedule pending approval');
    await biddingDb.query(
      `UPDATE contracts SET schedule_status = 'rejected', schedule_responded_at = NOW(),
                              schedule_response_notes = $2
        WHERE id = $1`,
      [contract.id, notes.trim()]
    );
    // Bounce back to 'contract_contractor_signed' so contractor can re-propose.
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'contract_contractor_signed', updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
    return await getContractForBid(bidId, homeownerId);
  } catch (error) { console.error('Reject schedule error:', error); throw error; }
}

// ── Workflow hooks: abandon offer (called by timer agent or manual admin action) ──

export async function abandonOffer(bidId: string, reason: string = 'No response within the SLA window') {
  try {
    const bid = await biddingDb.queryOne<{ id: string; project_id: string; selection_workflow_state: string }>(
      'SELECT id, project_id, selection_workflow_state FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    if (!['approved_by_owner', 'offer_accepted', 'contract_drafted', 'scheduled', 'addresses_revealed'].includes(bid.selection_workflow_state)) {
      throw new Error(`Cannot abandon a bid in state '${bid.selection_workflow_state}'`);
    }
    await biddingDb.query(
      `UPDATE bids
          SET selection_workflow_state = 'abandoned',
              abandoned_at = NOW(),
              status_updated_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [bidId]
    );
    // Re-open the project: paused siblings revive to 'pending' so the homeowner
    // can promote the next ranked bid.
    await projectDb.query(
      `UPDATE projects SET is_listed = true, status = 'bidding', updated_at = NOW() WHERE id = $1`,
      [bid.project_id]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'pending', updated_at = NOW()
        WHERE project_id = $1 AND selection_workflow_state = 'paused'`,
      [bid.project_id]
    );
    // Flag the contractor publicly + convert any collected deposit into a credit.
    const contractor = await biddingDb.queryOne<{ contractor_id: string }>('SELECT contractor_id FROM bids WHERE id = $1', [bidId]);
    if (contractor?.contractor_id) {
      await authDb.query(
        `UPDATE contractor_profiles SET abandonment_flag_count = abandonment_flag_count + 1,
                                         last_abandoned_at = NOW(), updated_at = NOW()
          WHERE user_id = $1`,
        [contractor.contractor_id]
      );
    }
    try {
      const { depositService } = await import('./depositService');
      await depositService.convertDepositToCredit(bidId);
    } catch (err) {
      console.error('Abandon → credit conversion failed (non-fatal):', err);
    }
    try {
      const { timerAgent } = await import('./workflow/timerAgent');
      await timerAgent.cancelTimersForBid(bidId);
    } catch { /* non-fatal */ }
    return { abandoned_bid_id: bidId, reason };
  } catch (error) { console.error('Abandon offer error:', error); throw error; }
}

// ── Contract acceptance + signatures ──

export async function acceptOffer(bidId: string, contractorId: string) {
  try {
    const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string; selection_workflow_state: string }>(
      'SELECT id, project_id, contractor_id, selection_workflow_state FROM bids WHERE id = $1', [bidId]
    );
    if (!bid) throw new Error('Bid not found');
    if (bid.contractor_id !== contractorId) throw new Error('Not your bid');
    if (bid.selection_workflow_state !== 'approved_by_owner') {
      throw new Error('Only an approved offer can be accepted');
    }
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'offer_accepted', updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
    try {
      const { timerAgent } = await import('./workflow/timerAgent');
      await timerAgent.cancelTimersForBid(bidId);
    } catch { /* non-fatal */ }
    const { contractGenerator } = await import('./contractGenerator');
    const contract = await contractGenerator.generateContract(bidId);
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'contract_drafted', updated_at = NOW() WHERE id = $1`,
      [bidId]
    );
    // Lock the project — no new bids accepted while contracting is in flight.
    // Other pending bids on this project move to 'paused' (TK-2733 hook).
    await projectDb.query(
      `UPDATE projects SET is_listed = false, status = 'in_contracting', updated_at = NOW() WHERE id = $1`,
      [bid.project_id]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'paused', updated_at = NOW()
        WHERE project_id = $1 AND id != $2 AND status = 'pending' AND selection_workflow_state IN ('pending','shortlisted')`,
      [bid.project_id, bidId]
    );
    // Email the homeowner so they know to expect the schedule + deposit prompts.
    try {
      const owner = await biddingDb.queryOne<{ email: string; first_name: string | null; project_title: string }>(
        `SELECT u.email, u.first_name, p.title AS project_title
           FROM bids b JOIN projects.projects p ON p.id = b.project_id
           JOIN auth.users u ON u.id = p.homeowner_id
          WHERE b.id = $1`,
        [bidId]
      );
      if (owner?.email) {
        await biddingDb.query(
          `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
           VALUES ('contractor_accepted_offer', $1, $2, $3, 'queued')`,
          [
            owner.email,
            `Contractor accepted your offer for "${owner.project_title}"`,
            `<p>Hi ${owner.first_name || 'there'},</p><p>Your selected contractor has accepted the offer for <strong>${owner.project_title}</strong>. Sign the work order on BidWork, review the schedule the contractor will propose, and then pay the 5% deposit to start the work.</p>`,
          ]
        );
      }
    } catch (err) { console.error('Acceptance email queue failed:', err); }
    return contract;
  } catch (error) { console.error('Accept offer error:', error); throw error; }
}

export async function getContractForBid(bidId: string, viewerUserId: string) {
  try {
    const v = await isBidVisibleTo(bidId, viewerUserId);
    if (!v.allowed) throw new Error('Not authorized');
    const contract = await biddingDb.queryOne<any>('SELECT * FROM contracts WHERE bid_id = $1', [bidId]);
    if (!contract) return null;
    const signatures = await biddingDb.queryAll('SELECT * FROM contract_signatures WHERE contract_id = $1 ORDER BY signed_at', [contract.id]);
    return { ...contract, signatures };
  } catch (error) { console.error('Get contract error:', error); throw error; }
}

export async function signContract(bidId: string, viewer: { userId: string; ipAddress?: string; userAgent?: string }, typedName: string) {
  try {
    if (!typedName?.trim()) throw new Error('typed_name is required');
    const v = await isBidVisibleTo(bidId, viewer.userId);
    if (!v.allowed) throw new Error('Not authorized');
    const role: 'homeowner' | 'contractor' = v.isOwner ? 'homeowner' : 'contractor';
    const contract = await biddingDb.queryOne<{ id: string; status: string }>('SELECT id, status FROM contracts WHERE bid_id = $1', [bidId]);
    if (!contract) throw new Error('Contract not found — accept the offer first');

    await biddingDb.query(
      `INSERT INTO contract_signatures (contract_id, signer_role, signer_user_id, typed_name, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5::INET,$6)
       ON CONFLICT (contract_id, signer_role) DO NOTHING`,
      [contract.id, role, viewer.userId, typedName.trim(), viewer.ipAddress || null, viewer.userAgent || null]
    );

    const sigs = await biddingDb.queryAll<{ signer_role: string }>('SELECT signer_role FROM contract_signatures WHERE contract_id = $1', [contract.id]);
    const haveOwner = sigs.some(s => s.signer_role === 'homeowner');
    const haveContractor = sigs.some(s => s.signer_role === 'contractor');

    // Workflow state after the latest signature: track the last signer.
    // contracts.status='executed' is the canonical "both signed" signal; the
    // bid's workflow state continues at contract_contractor_signed until
    // schedule + deposit advance it. Address reveal happens ONLY on deposit
    // conversion (depositService.convertDepositToFee → 'addresses_revealed').
    const nextState = haveContractor ? 'contract_contractor_signed' :
                      haveOwner ? 'contract_owner_signed' : null;
    if (nextState) {
      await biddingDb.query(
        `UPDATE bids SET selection_workflow_state = $2, updated_at = NOW() WHERE id = $1`,
        [bidId, nextState]
      );
    }
    if (haveOwner && haveContractor) {
      await biddingDb.query(
        `UPDATE contracts SET status = 'executed', finalized_at = NOW() WHERE id = $1`,
        [contract.id]
      );
      // Render the finalized signed work order with both signatures, BidWork
      // verification stamp, reference number, and timestamps. Failure here
      // should not block the state transition — log and continue.
      try {
        const { generateSignedContract } = await import('./contractGenerator');
        await generateSignedContract(bidId);
      } catch (e) {
        console.error('generateSignedContract failed:', e);
      }
      // No deposit conversion here — that's gated on schedule approval +
      // actual payment via Stripe webhook (depositService.handleStripeWebhook
      // calls convertDepositToFee on payment_intent.succeeded).
    }

    return await getContractForBid(bidId, viewer.userId);
  } catch (error) { console.error('Sign contract error:', error); throw error; }
}

// ── Private bid messaging (owner ↔ that bid's contractor) ──

export async function postBidMessage(bidId: string, sender: { userId: string; role: 'homeowner' | 'contractor' }, rawMessage: string) {
  try {
    if (!rawMessage || rawMessage.trim().length === 0) throw new Error('Message cannot be empty');
    const v = await isBidVisibleTo(bidId, sender.userId);
    if (!v.allowed) throw new Error('Not authorized');
    if (sender.role === 'homeowner' && !v.isOwner) throw new Error('Not authorized');
    if (sender.role === 'contractor' && !v.isContractor) throw new Error('Not authorized');
    const { stripContactInfo } = await import('./questionModerationService');
    const sanitized = stripContactInfo(rawMessage);
    return await biddingDb.queryOne(
      `INSERT INTO bid_messages (bid_id, sender_role, sender_user_id, raw_message, sanitized_message)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, bid_id, sender_role, sender_user_id, sanitized_message, created_at, read_at`,
      [bidId, sender.role, sender.userId, rawMessage, sanitized]
    );
  } catch (error) { console.error('Post bid message error:', error); throw error; }
}

export async function listBidMessages(bidId: string, viewerUserId: string) {
  try {
    const v = await isBidVisibleTo(bidId, viewerUserId);
    if (!v.allowed) throw new Error('Not authorized');
    return await biddingDb.queryAll(
      `SELECT id, bid_id, sender_role, sender_user_id, sanitized_message, created_at, read_at
         FROM bid_messages WHERE bid_id = $1 ORDER BY created_at ASC`,
      [bidId]
    );
  } catch (error) { console.error('List bid messages error:', error); throw error; }
}

export async function markBidMessageRead(bidId: string, messageId: string, viewerUserId: string) {
  try {
    const v = await isBidVisibleTo(bidId, viewerUserId);
    if (!v.allowed) throw new Error('Not authorized');
    // Recipient is the role opposite the sender; we mark read only when the viewer is not the sender.
    return await biddingDb.queryOne(
      `UPDATE bid_messages SET read_at = NOW()
        WHERE id = $1 AND bid_id = $2 AND sender_user_id != $3 AND read_at IS NULL
        RETURNING *`,
      [messageId, bidId, viewerUserId]
    );
  } catch (error) { console.error('Mark message read error:', error); throw error; }
}

// ── Bid Attachments ──

const BID_ATTACHMENT_MIME_ALLOW = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/jpg',
]);
const BID_ATTACHMENT_MAX_FILES = 10;
const BID_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export async function isBidVisibleTo(bidId: string, viewerUserId: string): Promise<{ allowed: boolean; isOwner: boolean; isContractor: boolean; bid: any }> {
  const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string }>(
    'SELECT id, project_id, contractor_id FROM bids WHERE id = $1', [bidId]
  );
  if (!bid) return { allowed: false, isOwner: false, isContractor: false, bid: null };
  const project = await projectDb.queryOne<{ homeowner_id: string }>(
    'SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]
  );
  const isOwner = project?.homeowner_id === viewerUserId;
  const isContractor = bid.contractor_id === viewerUserId;
  return { allowed: isOwner || isContractor, isOwner, isContractor, bid };
}

export async function finalizeBidAttachment(bidId: string, contractorId: string, attachment: { file_name: string; s3_key: string; mime_type: string; size_bytes: number }) {
  try {
    if (!BID_ATTACHMENT_MIME_ALLOW.has(attachment.mime_type)) {
      throw new Error(`Unsupported file type ${attachment.mime_type}`);
    }
    if (attachment.size_bytes > BID_ATTACHMENT_MAX_BYTES) {
      throw new Error('File exceeds 25 MB limit');
    }
    const bid = await biddingDb.queryOne<{ id: string; contractor_id: string }>('SELECT id, contractor_id FROM bids WHERE id = $1', [bidId]);
    if (!bid) throw new Error('Bid not found');
    if (bid.contractor_id !== contractorId) throw new Error('Not your bid');
    const count = await biddingDb.queryOne<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM bid_attachments WHERE bid_id = $1', [bidId]);
    if (Number(count?.count ?? 0) >= BID_ATTACHMENT_MAX_FILES) {
      throw new Error(`Maximum of ${BID_ATTACHMENT_MAX_FILES} attachments per bid`);
    }
    return await biddingDb.queryOne(
      `INSERT INTO bid_attachments (bid_id, file_name, s3_key, mime_type, size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [bidId, attachment.file_name, attachment.s3_key, attachment.mime_type, attachment.size_bytes, contractorId]
    );
  } catch (error) { console.error('Finalize attachment error:', error); throw error; }
}

export async function listBidAttachments(bidId: string, viewerUserId: string) {
  try {
    const v = await isBidVisibleTo(bidId, viewerUserId);
    if (!v.allowed) throw new Error('Not authorized');
    return await biddingDb.queryAll('SELECT * FROM bid_attachments WHERE bid_id = $1 ORDER BY uploaded_at', [bidId]);
  } catch (error) { console.error('List attachments error:', error); throw error; }
}

export async function deleteBidAttachment(bidId: string, attachmentId: string, requesterId: string) {
  try {
    const row = await biddingDb.queryOne<{ id: string; bid_id: string; uploaded_by: string; s3_key: string }>(
      'SELECT id, bid_id, uploaded_by, s3_key FROM bid_attachments WHERE id = $1 AND bid_id = $2', [attachmentId, bidId]
    );
    if (!row) throw new Error('Attachment not found');
    if (row.uploaded_by !== requesterId) throw new Error('Not authorized');
    await biddingDb.query('DELETE FROM bid_attachments WHERE id = $1', [attachmentId]);
    return { id: attachmentId, s3_key: row.s3_key };
  } catch (error) { console.error('Delete attachment error:', error); throw error; }
}
