import { workerDb, projectDb } from './domainDb';
import { s3Service } from './s3Service';
import { togetherApi } from './togetherApiService';

interface AiJob {
  id: string;
  project_id: string;
  stage: string;
  attempt_count: number;
  max_attempts: number;
}

/**
 * Process a single AI job based on its stage
 */
export async function processJob(job: AiJob): Promise<void> {
  const startedAt = new Date();

  try {
    // Mark as processing
    await workerDb.query(
      'UPDATE ai_jobs SET status = $2, started_at = $3, attempt_count = attempt_count + 1 WHERE id = $1',
      [job.id, 'processing', startedAt]
    );

    switch (job.stage) {
      case 'classify':
        await processClassify(job);
        break;
      case 'scope_gen':
        await processScopeGen(job);
        break;
      case 'bid_calc':
        await processBidCalc(job);
        break;
      default:
        throw new Error(`Unknown stage: ${job.stage}`);
    }

    // Mark completed
    await workerDb.query(
      'UPDATE ai_jobs SET status = $2, completed_at = NOW() WHERE id = $1',
      [job.id, 'completed']
    );
  } catch (error: any) {
    console.error(`[pipeline] Job ${job.id} (${job.stage}) failed:`, error.message);
    await handleJobFailure(job, error.message);
  }
}

/**
 * Stage 1: Classify the project from one representative photo
 */
async function processClassify(job: AiJob): Promise<void> {
  // Get project info and representative photo
  const project = await projectDb.queryOne<{ description: string }>(
    'SELECT description FROM projects WHERE id = $1', [job.project_id]
  );
  const media = await projectDb.queryOne<{ s3_key: string }>(
    'SELECT s3_key FROM project_media WHERE project_id = $1 ORDER BY is_representative DESC, sort_order ASC LIMIT 1',
    [job.project_id]
  );

  if (!media) throw new Error('No media found for project');

  const imageUrl = await s3Service.getPresignedDownloadUrl(media.s3_key);
  const result = await togetherApi.classifyProject(imageUrl, project?.description || '');

  // Save result and update project
  await workerDb.query(
    'UPDATE ai_jobs SET result = $2, model_used = $3, input_tokens = $4, output_tokens = $5 WHERE id = $1',
    [job.id, JSON.stringify(result), result.model, result.inputTokens, result.outputTokens]
  );

  await projectDb.query(
    'UPDATE projects SET category = $2, complexity_tier = $3, scope_status = $4, updated_at = NOW() WHERE id = $1',
    [job.project_id, result.category, result.complexity, 'generating_scope']
  );

  // Chain: create Stage 2 job
  await projectDb.query(
    'INSERT INTO ai_jobs (project_id, stage, priority) VALUES ($1, $2, $3)',
    [job.project_id, 'scope_gen', 1]
  );

  console.log(`[pipeline] Classified project ${job.project_id}: ${result.category} (${result.complexity})`);
}

/**
 * Stage 2: Generate scope of work from all photos
 */
async function processScopeGen(job: AiJob): Promise<void> {
  const project = await projectDb.queryOne<{ description: string; category: string; quality_tier: string }>(
    'SELECT description, category, quality_tier FROM projects WHERE id = $1', [job.project_id]
  );
  if (!project) throw new Error('Project not found');

  const mediaRows = await projectDb.queryAll<{ s3_key: string }>(
    'SELECT s3_key FROM project_media WHERE project_id = $1 ORDER BY sort_order', [job.project_id]
  );

  const imageUrls = await Promise.all(mediaRows.map(m => s3Service.getPresignedDownloadUrl(m.s3_key)));
  if (imageUrls.length === 0) throw new Error('No media found');

  const result = await togetherApi.generateScope(imageUrls, project.category || 'general', project.description || '', project.quality_tier || 'standard');

  // Save AI job metadata
  await workerDb.query(
    'UPDATE ai_jobs SET result = $2, model_used = $3, input_tokens = $4, output_tokens = $5 WHERE id = $1',
    [job.id, JSON.stringify({ taskCount: result.tasks.length }), result.model, result.inputTokens, result.outputTokens]
  );

  // Insert scope tasks
  for (let i = 0; i < result.tasks.length; i++) {
    const t = result.tasks[i];
    await projectDb.query(
      `INSERT INTO scope_tasks (project_id, sort_order, title, description, quantity, unit, materials, labor_hours_min, labor_hours_max, cost_min, cost_max, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [job.project_id, i, t.title, t.description, t.quantity || 1, t.unit || 'each',
       JSON.stringify(t.materials || []), t.labor_hours_min || 0, t.labor_hours_max || 0,
       t.cost_min || 0, t.cost_max || 0, t.confidence || 0.7]
    );
  }

  await projectDb.query(
    'UPDATE projects SET scope_status = $2, updated_at = NOW() WHERE id = $1',
    [job.project_id, 'calculating_bids']
  );

  // Chain: create Stage 3 job
  await projectDb.query(
    'INSERT INTO ai_jobs (project_id, stage, priority) VALUES ($1, $2, $3)',
    [job.project_id, 'bid_calc', 2]
  );

  console.log(`[pipeline] Generated ${result.tasks.length} scope tasks for project ${job.project_id}`);
}

/**
 * Stage 3: Calculate bid floor and ceiling
 */
async function processBidCalc(job: AiJob): Promise<void> {
  const project = await projectDb.queryOne<{ location_address: string; quality_tier: string }>(
    'SELECT location_address, quality_tier FROM projects WHERE id = $1', [job.project_id]
  );
  if (!project) throw new Error('Project not found');

  const tasks = await projectDb.queryAll<{ title: string; quantity: number; unit: string; cost_min: number; cost_max: number }>(
    'SELECT title, quantity, unit, cost_min, cost_max FROM scope_tasks WHERE project_id = $1 AND is_removed = false ORDER BY sort_order',
    [job.project_id]
  );

  if (tasks.length === 0) throw new Error('No scope tasks found');

  const result = await togetherApi.calculateBidRange(tasks, project.location_address || '', project.quality_tier || 'standard');

  // Save AI job metadata
  await workerDb.query(
    'UPDATE ai_jobs SET result = $2, model_used = $3, input_tokens = $4, output_tokens = $5 WHERE id = $1',
    [job.id, JSON.stringify({ bid_floor: result.bid_floor, bid_ceiling: result.bid_ceiling }), result.model, result.inputTokens, result.outputTokens]
  );

  // Update project with bid range
  await projectDb.query(
    `UPDATE projects SET bid_floor = $2, bid_ceiling = $3, estimated_days_min = $4, estimated_days_max = $5,
     ai_confidence_score = $6, scope_status = 'complete', updated_at = NOW() WHERE id = $1`,
    [job.project_id, result.bid_floor, result.bid_ceiling, result.estimated_days_min, result.estimated_days_max, result.confidence]
  );

  // Update per-task costs if provided
  if (result.per_task_costs?.length > 0) {
    for (const ptc of result.per_task_costs) {
      await projectDb.query(
        'UPDATE scope_tasks SET cost_min = $2, cost_max = $3, updated_at = NOW() WHERE project_id = $1 AND title = $4',
        [job.project_id, ptc.cost_min, ptc.cost_max, ptc.title]
      );
    }
  }

  console.log(`[pipeline] Bid range for project ${job.project_id}: $${result.bid_floor} - $${result.bid_ceiling}`);
}

/**
 * Handle job failure: retry with backoff or mark as permanently failed
 */
async function handleJobFailure(job: AiJob, errorMessage: string): Promise<void> {
  const newAttempt = job.attempt_count + 1;

  if (newAttempt >= job.max_attempts) {
    // Permanently failed
    await workerDb.query(
      'UPDATE ai_jobs SET status = $2, last_error = $3 WHERE id = $1',
      [job.id, 'failed', errorMessage]
    );
    await projectDb.query(
      'UPDATE projects SET scope_status = $2, updated_at = NOW() WHERE id = $1',
      [job.project_id, 'failed']
    );
    console.error(`[pipeline] Job ${job.id} permanently failed after ${newAttempt} attempts`);
  } else {
    // Retry with exponential backoff
    const backoffSeconds = [2, 10, 30, 60][Math.min(newAttempt - 1, 3)];
    const scheduledAt = new Date(Date.now() + backoffSeconds * 1000);
    await workerDb.query(
      'UPDATE ai_jobs SET status = $2, last_error = $3, scheduled_at = $4 WHERE id = $1',
      [job.id, 'pending', errorMessage, scheduledAt]
    );
    console.log(`[pipeline] Job ${job.id} scheduled for retry in ${backoffSeconds}s (attempt ${newAttempt}/${job.max_attempts})`);
  }
}

export const aiPipelineService = { processJob };
