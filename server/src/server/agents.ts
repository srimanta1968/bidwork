import { timerAgent } from '../services/workflow/timerAgent';
import { emailDispatcher } from '../services/workflow/emailDispatcher';

/**
 * Bootstraps the in-process timer agent + email dispatcher. Called from app.ts
 * after the HTTP server is listening. Both loops use SELECT ... FOR UPDATE
 * SKIP LOCKED inside their tickOnce() so multiple replicas behind a load
 * balancer cooperate safely.
 *
 * Disable for tests with AGENTS_ENABLED=false. SIGTERM/SIGINT call stopAgents()
 * with a drain timeout so any in-flight tick completes before exit.
 */

const TIMER_INTERVAL_MS = parseInt(process.env.TIMER_AGENT_INTERVAL_MS || '60000', 10);
const EMAIL_INTERVAL_MS = parseInt(process.env.EMAIL_DISPATCHER_INTERVAL_MS || '30000', 10);
const DRAIN_TIMEOUT_MS = parseInt(process.env.AGENT_DRAIN_TIMEOUT_MS || '25000', 10);

let timerHandle: NodeJS.Timeout | null = null;
let emailHandle: NodeJS.Timeout | null = null;
let stopping = false;
let inflightTimer: Promise<any> | null = null;
let inflightEmail: Promise<any> | null = null;

async function safeTimerTick() {
  if (stopping) return;
  inflightTimer = timerAgent._runTickAndRecord().catch(err => console.error('[timerAgent] tick error:', err));
  await inflightTimer;
  inflightTimer = null;
}

async function safeEmailTick() {
  if (stopping) return;
  inflightEmail = emailDispatcher._runTickAndRecord().catch(err => console.error('[emailDispatcher] tick error:', err));
  await inflightEmail;
  inflightEmail = null;
}

export function startAgents(): void {
  if (process.env.AGENTS_ENABLED === 'false') {
    console.log('[agents] AGENTS_ENABLED=false — not starting');
    return;
  }
  stopping = false;
  timerHandle = setInterval(safeTimerTick, TIMER_INTERVAL_MS);
  emailHandle = setInterval(safeEmailTick, EMAIL_INTERVAL_MS);
  // Kick once so health endpoints have data immediately.
  setImmediate(safeTimerTick);
  setImmediate(safeEmailTick);
  console.log(`[agents] started — timer every ${TIMER_INTERVAL_MS}ms, email every ${EMAIL_INTERVAL_MS}ms`);
}

export async function stopAgents(): Promise<void> {
  stopping = true;
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  if (emailHandle) { clearInterval(emailHandle); emailHandle = null; }
  // Give any in-flight tick up to DRAIN_TIMEOUT_MS to finish.
  const drain = Promise.all([inflightTimer, inflightEmail].filter(Boolean));
  await Promise.race([drain, new Promise(r => setTimeout(r, DRAIN_TIMEOUT_MS))]);
  console.log('[agents] stopped');
}

export async function getAgentsHealth() {
  return {
    timer: await timerAgent.getHealth(),
    email: await emailDispatcher.getHealth(),
    enabled: process.env.AGENTS_ENABLED !== 'false',
  };
}
