import { config } from '../config/env';
import { workerDb } from './domainDb';
import { aiPipelineService } from './aiPipelineService';

let isRunning = false;
let activeJobs = 0;

interface PendingJob {
  id: string;
  project_id: string;
  stage: string;
  attempt_count: number;
  max_attempts: number;
}

/**
 * Poll for one pending job using FOR UPDATE SKIP LOCKED
 * This is safe for concurrent workers — each grabs a different job
 */
async function pollForJob(): Promise<PendingJob | null> {
  try {
    const job = await workerDb.queryOne<PendingJob>(`
      SELECT id, project_id, stage, attempt_count, max_attempts
      FROM ai_jobs
      WHERE status = 'pending' AND scheduled_at <= NOW()
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    return job;
  } catch (error) {
    console.error('[worker] Poll error:', error);
    return null;
  }
}

/**
 * Single poll-and-process cycle
 */
async function pollAndProcess(): Promise<void> {
  if (activeJobs >= config.aiWorker.concurrency) return;

  const job = await pollForJob();
  if (!job) return;

  activeJobs++;
  try {
    await aiPipelineService.processJob(job);
  } finally {
    activeJobs--;
  }
}

/**
 * Start the background AI worker
 * Runs N concurrent polling loops
 */
export function startAiWorker(): void {
  if (isRunning) return;
  if (!config.together.apiKey) {
    console.log('[worker] No TOGETHER_API_KEY configured — AI worker disabled');
    return;
  }

  isRunning = true;
  console.log(`[worker] Starting AI worker (concurrency: ${config.aiWorker.concurrency}, poll: ${config.aiWorker.pollIntervalMs}ms)`);

  setInterval(async () => {
    try {
      // Launch up to concurrency limit
      const slots = config.aiWorker.concurrency - activeJobs;
      const polls = Array.from({ length: Math.max(slots, 0) }, () => pollAndProcess());
      await Promise.allSettled(polls);
    } catch (error) {
      console.error('[worker] Poll cycle error:', error);
    }
  }, config.aiWorker.pollIntervalMs);
}

/**
 * Get worker status (for health check)
 */
export function getWorkerStatus(): { running: boolean; activeJobs: number; concurrency: number } {
  return { running: isRunning, activeJobs, concurrency: config.aiWorker.concurrency };
}

export const aiWorker = { startAiWorker, getWorkerStatus };
