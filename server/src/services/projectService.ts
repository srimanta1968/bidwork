import { projectDb } from './domainDb';

export async function createProject(homeownerId: string, data: { title: string; description?: string; location_address?: string; urgency?: string; quality_tier?: string }) {
  try {
    return await projectDb.queryOne(
      `INSERT INTO projects (homeowner_id, title, description, location_address, urgency, quality_tier, scope_status, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'uploading', 'draft') RETURNING *`,
      [homeownerId, data.title, data.description || null, data.location_address || null, data.urgency || 'flexible', data.quality_tier || 'standard']
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

export async function getScopeTasks(projectId: string) {
  try { return await projectDb.queryAll('SELECT * FROM scope_tasks WHERE project_id = $1 AND is_removed = false ORDER BY sort_order', [projectId]); }
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

export async function getAvailableProjects(category: string) {
  try {
    return await projectDb.queryAll(
      "SELECT * FROM projects WHERE is_listed = true AND status = 'bidding' AND ($1 = '' OR category = $1) ORDER BY created_at DESC",
      [category || '']
    );
  } catch (error) { console.error('Get available projects error:', error); throw error; }
}

export const projectService = {
  createProject, addMedia, startAiPipeline, getProject, getProjectsByHomeowner,
  getProjectMedia, getScopeTasks, getProjectStatus, approveProject, retryPipeline, getAvailableProjects,
};
