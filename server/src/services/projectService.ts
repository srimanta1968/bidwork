import { projectDb } from './domainDb';

/**
 * Parse city and zip from a location address string.
 * Handles formats like "123 Main St, Springfield, IL 62701"
 */
export function parseCityZip(address: string | null): { city: string | null; zip_code: string | null } {
  if (!address) return { city: null, zip_code: null };
  const zipMatch = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
  const zip_code = zipMatch ? zipMatch[1] : null;
  const parts = address.split(',').map(p => p.trim());
  let city: string | null = null;
  if (parts.length >= 2) {
    city = parts[parts.length - 2] || parts[0];
    // Remove state abbreviation and zip from city
    city = city.replace(/\b[A-Z]{2}\b/g, '').replace(/\d+/g, '').trim();
    if (!city && parts.length >= 3) city = parts[parts.length - 3];
  } else if (parts.length === 1) {
    city = parts[0].replace(/\d+/g, '').trim();
  }
  return { city: city || null, zip_code };
}

export async function createProject(homeownerId: string, data: { title: string; description?: string; location_address?: string; city?: string; zip_code?: string; urgency?: string; quality_tier?: string; worker_type_preference?: string }) {
  try {
    // Use explicit city/zip if provided, otherwise parse from location_address
    const parsed = parseCityZip(data.location_address || null);
    const city = data.city || parsed.city;
    const zip_code = data.zip_code || parsed.zip_code;
    return await projectDb.queryOne(
      `INSERT INTO projects (homeowner_id, title, description, location_address, city, zip_code, urgency, quality_tier, worker_type_preference, scope_status, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploading', 'draft') RETURNING *`,
      [homeownerId, data.title, data.description || null, data.location_address || null, city, zip_code, data.urgency || 'flexible', data.quality_tier || 'standard', data.worker_type_preference || 'both']
    );
  } catch (error) { console.error('Create project error:', error); throw error; }
}

export async function addMedia(projectId: string, media: { s3_key: string; media_type: string; file_size_bytes?: number; mime_type?: string; sort_order?: number; is_representative?: boolean }) {
  try {
    return await projectDb.queryOne(
      `INSERT INTO project_media (project_id, s3_key, media_type, file_size_bytes, mime_type, sort_order, is_representative)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, media.s3_key, media.media_type, media.file_size_bytes || null, media.mime_type || null, media.sort_order || 0, media.is_representative || false]
    );
  } catch (error) { console.error('Add media error:', error); throw error; }
}

export async function startAiPipeline(projectId: string) {
  try {
    await projectDb.query("UPDATE projects SET scope_status = 'classifying', updated_at = NOW() WHERE id = $1", [projectId]);
    await projectDb.query("INSERT INTO ai_jobs (project_id, stage, priority) VALUES ($1, 'classify', 0)", [projectId]);
  } catch (error) { console.error('Start pipeline error:', error); throw error; }
}

export async function getProject(projectId: string) {
  try { return await projectDb.queryOne('SELECT * FROM projects WHERE id = $1', [projectId]); }
  catch (error) { console.error('Get project error:', error); throw error; }
}

export async function getProjectsByHomeowner(homeownerId: string) {
  try { return await projectDb.queryAll('SELECT * FROM projects WHERE homeowner_id = $1 ORDER BY created_at DESC', [homeownerId]); }
  catch (error) { console.error('Get projects error:', error); throw error; }
}

export async function getProjectMedia(projectId: string) {
  try { return await projectDb.queryAll('SELECT * FROM project_media WHERE project_id = $1 ORDER BY sort_order', [projectId]); }
  catch (error) { console.error('Get media error:', error); throw error; }
}

export async function getScopeTasks(projectId: string, forContractor: boolean = false) {
  try {
    if (forContractor) {
      // Contractor view: show effective_start_price, hide ceiling, exclude hidden tasks
      return await projectDb.queryAll(
        `SELECT id, project_id, sort_order, title, description, category, quantity, unit,
                COALESCE(owner_start_price, cost_min) AS effective_start_price,
                labor_hours_min, labor_hours_max, ai_confidence, photo_evidence_keys,
                homeowner_notes, dimensions, created_at
         FROM scope_tasks
         WHERE project_id = $1 AND is_removed = false AND is_hidden = false
         ORDER BY sort_order`,
        [projectId]
      );
    }
    return await projectDb.queryAll('SELECT * FROM scope_tasks WHERE project_id = $1 AND is_removed = false ORDER BY sort_order', [projectId]);
  }
  catch (error) { console.error('Get scope tasks error:', error); throw error; }
}

export async function getProjectStatus(projectId: string) {
  try {
    const project = await projectDb.queryOne<{ scope_status: string }>('SELECT scope_status FROM projects WHERE id = $1', [projectId]);
    const stages = await projectDb.queryAll<{ stage: string; status: string }>('SELECT stage, status FROM ai_jobs WHERE project_id = $1 ORDER BY created_at', [projectId]);
    return { scope_status: project?.scope_status, stages };
  } catch (error) { console.error('Get status error:', error); throw error; }
}

export async function approveProject(projectId: string) {
  try {
    return await projectDb.queryOne(
      "UPDATE projects SET is_approved = true, is_listed = true, status = 'bidding', updated_at = NOW() WHERE id = $1 RETURNING *",
      [projectId]
    );
  } catch (error) { console.error('Approve project error:', error); throw error; }
}

export async function retryPipeline(projectId: string) {
  try {
    const failedJob = await projectDb.queryOne<{ stage: string }>('SELECT stage FROM ai_jobs WHERE project_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', [projectId, 'failed']);
    if (!failedJob) throw new Error('No failed jobs to retry');
    const stageStatusMap: Record<string, string> = { classify: 'classifying', scope_gen: 'generating_scope', bid_calc: 'calculating_bids' };
    await projectDb.query("UPDATE projects SET scope_status = $2, updated_at = NOW() WHERE id = $1", [projectId, stageStatusMap[failedJob.stage] || 'classifying']);
    await projectDb.query("INSERT INTO ai_jobs (project_id, stage, priority) VALUES ($1, $2, 1)", [projectId, failedJob.stage]);
  } catch (error) { console.error('Retry pipeline error:', error); throw error; }
}

export async function getAvailableProjects(filters: { category?: string; city?: string; page?: number; limit?: number; userRole?: string; servingCities?: string[]; servingZipcodes?: string[]; servingLocationIds?: string[] }) {
  try {
    const conditions = [
      "is_listed = true",
      "status = 'bidding'",
      "status NOT IN ('in_contracting','assigned','completed','cancelled')",
    ];
    const values: any[] = [];
    let idx = 1;

    if (filters.category) { conditions.push(`category = $${idx++}`); values.push(filters.category); }

    if (filters.userRole === 'contractor') {
      conditions.push(`worker_type_preference IN ('contractor', 'both')`);
    } else if (filters.userRole === 'skilled_labor') {
      conditions.push(`worker_type_preference IN ('skilled_labor', 'both')`);
    }

    // Service-area filter — UNION of every source the contractor populated:
    //   • serving_location_ids → expand to zip set + city set
    //   • legacy serving_zipcodes → exact-match zip
    //   • legacy serving_cities  → ILIKE city fallback
    // A contractor with a metro picked PLUS a manually-added Danville chip in
    // the legacy free-text list should see jobs matching either source. The
    // (city) query-string filter only kicks in when nothing else is set.
    const areaConditions: string[] = [];
    if (filters.servingLocationIds?.length) {
      const { locationService } = await import('./locationService');
      const expanded = await locationService.expandLocationsForFilter(filters.servingLocationIds);
      if (expanded.zips.length > 0) {
        areaConditions.push(`zip_code = ANY($${idx++})`);
        values.push(expanded.zips);
      }
      if (expanded.cities.length > 0) {
        areaConditions.push(`city ILIKE ANY($${idx++})`);
        values.push(expanded.cities.map(c => `%${c}%`));
      }
    }
    if (filters.servingCities?.length) {
      areaConditions.push(`city ILIKE ANY($${idx++})`);
      values.push(filters.servingCities.map(c => `%${c}%`));
    }
    if (filters.servingZipcodes?.length) {
      areaConditions.push(`zip_code = ANY($${idx++})`);
      values.push(filters.servingZipcodes);
    }
    if (areaConditions.length > 0) {
      conditions.push(`(${areaConditions.join(' OR ')})`);
    } else if (filters.city) {
      conditions.push(`(city ILIKE $${idx} OR location_address ILIKE $${idx})`);
      values.push(`%${filters.city}%`);
      idx++;
    }
    // If NO serving areas and NO city filter: show ALL jobs (no location filter)

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    values.push(limit);
    values.push(offset);

    const where = conditions.join(' AND ');
    return await projectDb.queryAll(
      `SELECT id, title, description, location_address, city, zip_code, category, complexity_tier, bid_floor, bid_ceiling,
              estimated_days_min, estimated_days_max, worker_type_preference, status, created_at
       FROM projects WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );
  } catch (error) { console.error('Get available projects error:', error); throw error; }
}

export async function updateProject(projectId: string, data: { title?: string; description?: string; location_address?: string; urgency?: string; quality_tier?: string }) {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.location_address !== undefined) { fields.push(`location_address = $${idx++}`); values.push(data.location_address); }
    if (data.urgency !== undefined) { fields.push(`urgency = $${idx++}`); values.push(data.urgency); }
    if (data.quality_tier !== undefined) { fields.push(`quality_tier = $${idx++}`); values.push(data.quality_tier); }

    if (fields.length === 0) return await getProject(projectId);

    fields.push(`updated_at = NOW()`);
    values.push(projectId);

    return await projectDb.queryOne(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} AND status = 'draft' RETURNING *`,
      values
    );
  } catch (error) { console.error('Update project error:', error); throw error; }
}

export async function deleteMedia(mediaId: string) {
  try {
    return await projectDb.queryOne('DELETE FROM project_media WHERE id = $1 RETURNING *', [mediaId]);
  } catch (error) { console.error('Delete media error:', error); throw error; }
}

export async function getBidPriceRule(jobCategory?: string) {
  try {
    // Try category-specific rule first, then fall back to global default
    if (jobCategory) {
      const categoryRule = await projectDb.queryOne<{ min_price_percentage: number }>(
        'SELECT min_price_percentage FROM bid_price_rules WHERE job_category = $1 ORDER BY effective_date DESC LIMIT 1',
        [jobCategory]
      );
      if (categoryRule) return categoryRule;
    }
    const globalRule = await projectDb.queryOne<{ min_price_percentage: number }>(
      'SELECT min_price_percentage FROM bid_price_rules WHERE job_category IS NULL ORDER BY effective_date DESC LIMIT 1', []
    );
    return globalRule || { min_price_percentage: 50 };
  } catch (error) { console.error('Get bid price rule error:', error); throw error; }
}

export async function setTaskOwnerPrice(projectId: string, taskId: string, ownerStartPrice: number) {
  try {
    return await projectDb.queryOne(
      'UPDATE scope_tasks SET owner_start_price = $3, updated_at = NOW() WHERE id = $2 AND project_id = $1 RETURNING *',
      [projectId, taskId, ownerStartPrice]
    );
  } catch (error) { console.error('Set task owner price error:', error); throw error; }
}

export async function getScopeTask(taskId: string) {
  try {
    return await projectDb.queryOne('SELECT * FROM scope_tasks WHERE id = $1', [taskId]);
  } catch (error) { console.error('Get scope task error:', error); throw error; }
}

export async function updateScopeTask(projectId: string, taskId: string, data: { title?: string; description?: string; homeowner_notes?: string; dimensions?: string; quantity?: number; unit?: string }) {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.homeowner_notes !== undefined) { fields.push(`homeowner_notes = $${idx++}`); values.push(data.homeowner_notes); }
    if (data.dimensions !== undefined) { fields.push(`dimensions = $${idx++}`); values.push(data.dimensions); }
    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.unit !== undefined) { fields.push(`unit = $${idx++}`); values.push(data.unit); }

    if (fields.length === 0) return await getScopeTask(taskId);

    fields.push(`updated_at = NOW()`);
    values.push(taskId);
    values.push(projectId);

    return await projectDb.queryOne(
      `UPDATE scope_tasks SET ${fields.join(', ')} WHERE id = $${idx} AND project_id = $${idx + 1} RETURNING *`,
      values
    );
  } catch (error) { console.error('Update scope task error:', error); throw error; }
}

export async function toggleTaskVisibility(projectId: string, taskId: string, isHidden: boolean) {
  try {
    return await projectDb.queryOne(
      'UPDATE scope_tasks SET is_hidden = $3, updated_at = NOW() WHERE id = $2 AND project_id = $1 RETURNING *',
      [projectId, taskId, isHidden]
    );
  } catch (error) { console.error('Toggle task visibility error:', error); throw error; }
}

/**
 * Flip who supplies materials for a single task. When ownerSupplies = true the
 * material portion of that task is excluded from the project's calculated
 * starting bid and the contractor view shows an "Owner supplies materials" tag.
 */
export async function setMaterialsSupplier(projectId: string, taskId: string, ownerSupplies: boolean) {
  try {
    return await projectDb.queryOne(
      'UPDATE scope_tasks SET owner_supplied_materials = $3, updated_at = NOW() WHERE id = $2 AND project_id = $1 RETURNING *',
      [projectId, taskId, ownerSupplies]
    );
  } catch (error) { console.error('Set materials supplier error:', error); throw error; }
}

/**
 * Strips full street address, keeping only city and zip for privacy.
 * Input: "123 Main St, Springfield, IL 62701"
 * Output: "Springfield, IL 62701"
 */
export function maskAddress(fullAddress: string | null): string {
  if (!fullAddress) return '';
  const parts = fullAddress.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts.slice(1).join(', ');
  }
  return fullAddress;
}

/**
 * Sanitize project for contractor view - hide full address
 */
export function sanitizeProjectForContractor(project: any, isAcceptedBidder: boolean): any {
  if (isAcceptedBidder) return project;
  return {
    ...project,
    location_address: maskAddress(project.location_address),
  };
}

/**
 * Bid summary for the homeowner: AI start price total, owner override total,
 * effective total, and the range of submitted-bid amounts.
 */
export async function getProjectBidSummary(projectId: string) {
  try {
    const tasks = await projectDb.queryAll<{
      ai_start_price: string | null;
      owner_start_price: string | null;
      material_cost_min: string | null;
      owner_supplied_materials: boolean;
    }>(
      `SELECT cost_min AS ai_start_price, owner_start_price,
              material_cost_min, owner_supplied_materials
         FROM scope_tasks WHERE project_id = $1 AND is_removed = false AND is_hidden = false`,
      [projectId]
    );
    let aiTotal = 0, ownerTotal = 0, effectiveTotal = 0;
    for (const t of tasks) {
      const ai = Number(t.ai_start_price || 0);
      const owner = t.owner_start_price !== null ? Number(t.owner_start_price) : null;
      // When the owner is supplying materials for a task, exclude the material
      // portion from the calculated starting bid — the contractor only quotes
      // labor for that task.
      const materialPortion = t.owner_supplied_materials ? Number(t.material_cost_min || 0) : 0;
      aiTotal += Math.max(0, ai - materialPortion);
      if (owner !== null) ownerTotal += Math.max(0, owner - materialPortion);
      effectiveTotal += Math.max(0, (owner !== null ? owner : ai) - materialPortion);
    }
    // Submitted bid range — only count bids that are still candidates.
    const range = await import('./domainDb').then(({ biddingDb }) => biddingDb.queryOne<{
      submitted_count: string; submitted_low: string | null; submitted_high: string | null; average: string | null;
    }>(
      `SELECT COUNT(*)::TEXT AS submitted_count,
              MIN(bid_amount)::TEXT AS submitted_low,
              MAX(bid_amount)::TEXT AS submitted_high,
              AVG(bid_amount)::TEXT AS average
         FROM bids
        WHERE project_id = $1
          AND status = 'pending'
          AND selection_workflow_state IN ('pending','shortlisted','approved_by_owner')`,
      [projectId]
    ));
    const submittedCount = Number(range?.submitted_count ?? 0);
    return {
      ai_start_price_total: Math.round(aiTotal * 100) / 100,
      owner_start_price_total: Math.round(ownerTotal * 100) / 100,
      effective_start_price_total: Math.round(effectiveTotal * 100) / 100,
      submitted_count: submittedCount,
      submitted_low: submittedCount ? Number(range?.submitted_low) : null,
      submitted_high: submittedCount ? Number(range?.submitted_high) : null,
      average: submittedCount ? Math.round(Number(range?.average) * 100) / 100 : null,
    };
  } catch (error) { console.error('Get bid summary error:', error); throw error; }
}

export async function isAcceptedBidder(projectId: string, contractorId: string): Promise<boolean> {
  try {
    const project = await projectDb.queryOne<{ assigned_contractor_id: string }>(
      'SELECT assigned_contractor_id FROM projects WHERE id = $1', [projectId]
    );
    return project?.assigned_contractor_id === contractorId;
  } catch (error) { console.error('Check accepted bidder error:', error); return false; }
}

export const projectService = {
  createProject, addMedia, startAiPipeline, getProject, getProjectsByHomeowner,
  getProjectMedia, getScopeTasks, getProjectStatus, approveProject, retryPipeline,
  getAvailableProjects, updateProject, deleteMedia, getBidPriceRule, setTaskOwnerPrice,
  getScopeTask, updateScopeTask, toggleTaskVisibility, setMaterialsSupplier,
  maskAddress, sanitizeProjectForContractor, isAcceptedBidder,
  getProjectBidSummary,
};
