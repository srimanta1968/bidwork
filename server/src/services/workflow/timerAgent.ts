import { biddingDb } from '../domainDb';
import { addBusinessHours } from './businessDay';
import { bidService } from '../bidService';

/**
 * Timer agent — schedules and fires reminder + auto-abandon timers for the
 * Select & Notify SLA. Runs in-process via the agent bootstrap (TK-2711); see
 * tickOnce() for the per-tick contract.
 */

export type TimerType = 'select_notify_reminder_24h' | 'select_notify_abandon_72h';

const REMINDER_HOURS = parseInt(process.env.SELECT_NOTIFY_REMINDER_HOURS || '24', 10);
const ABANDON_HOURS = parseInt(process.env.SELECT_NOTIFY_ABANDON_HOURS || '72', 10);

export async function scheduleSelectNotifyTimers(bidId: string) {
  const reminderAt = await addBusinessHours(new Date(), REMINDER_HOURS);
  const abandonAt = await addBusinessHours(new Date(), ABANDON_HOURS);
  await biddingDb.query(
    `INSERT INTO workflow_timers (entity_id, timer_type, scheduled_for, payload)
     VALUES ($1, 'select_notify_reminder_24h', $2, $3::jsonb)`,
    [bidId, reminderAt, JSON.stringify({ hours: REMINDER_HOURS })]
  );
  await biddingDb.query(
    `INSERT INTO workflow_timers (entity_id, timer_type, scheduled_for, payload)
     VALUES ($1, 'select_notify_abandon_72h', $2, $3::jsonb)`,
    [bidId, abandonAt, JSON.stringify({ hours: ABANDON_HOURS })]
  );
}

export async function cancelTimersForBid(bidId: string) {
  await biddingDb.query(
    `UPDATE workflow_timers SET status = 'cancelled' WHERE entity_id = $1 AND status = 'scheduled'`,
    [bidId]
  );
}

/**
 * Fire any timers whose scheduled_for <= NOW(). Uses SKIP LOCKED so multiple
 * server replicas cooperate safely.
 */
export async function tickOnce(): Promise<{ fired: number; skipped: number }> {
  const due = await biddingDb.queryAll<{ id: string; entity_id: string; timer_type: string }>(
    `SELECT id, entity_id, timer_type FROM workflow_timers
      WHERE status = 'scheduled' AND scheduled_for <= NOW()
      ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT 50`
  );
  let fired = 0;
  let skipped = 0;
  for (const t of due) {
    try {
      await fireTimer(t.entity_id, t.timer_type as TimerType);
      await biddingDb.query(`UPDATE workflow_timers SET status = 'fired', fired_at = NOW() WHERE id = $1`, [t.id]);
      fired++;
    } catch (err) {
      console.error(`[timerAgent] timer ${t.id} (${t.timer_type}) failed:`, err);
      skipped++;
    }
  }
  return { fired, skipped };
}

async function fireTimer(bidId: string, timerType: TimerType) {
  const bid = await biddingDb.queryOne<{ selection_workflow_state: string }>(
    'SELECT selection_workflow_state FROM bids WHERE id = $1', [bidId]
  );
  if (!bid) return;
  if (timerType === 'select_notify_reminder_24h') {
    if (bid.selection_workflow_state !== 'approved_by_owner') return;
    // Reminder is best-effort — log + queue an admin email.
    await biddingDb.query(
      `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
       SELECT 'acceptance_reminder', u.email,
              'Reminder: BidWork offer awaiting your acceptance',
              '<p>Please log in to BidWork to accept the homeowner''s offer. The 72-hour window is closing.</p>',
              'queued'
         FROM bids b JOIN auth.users u ON u.id = b.contractor_id WHERE b.id = $1`,
      [bidId]
    );
    return;
  }
  if (timerType === 'select_notify_abandon_72h') {
    if (!['approved_by_owner', 'offer_accepted', 'contract_drafted'].includes(bid.selection_workflow_state)) return;
    await bidService.abandonOffer(bidId, 'Auto-abandoned: contractor did not accept within 72 working hours');
    return;
  }
}

let lastTick = 0;
let lastTickFired = 0;
let lastDueCount = 0;

export async function getHealth() {
  const due = await biddingDb.queryOne<{ count: string }>(`SELECT COUNT(*)::TEXT AS count FROM workflow_timers WHERE status = 'scheduled' AND scheduled_for <= NOW()`);
  return {
    last_tick_at: lastTick ? new Date(lastTick).toISOString() : null,
    last_tick_fired: lastTickFired,
    due_count: Number(due?.count ?? 0),
    last_due_count: lastDueCount,
  };
}

export async function _runTickAndRecord() {
  const r = await tickOnce();
  lastTick = Date.now();
  lastTickFired = r.fired;
  lastDueCount = r.fired + r.skipped;
  return r;
}

export const timerAgent = { scheduleSelectNotifyTimers, cancelTimersForBid, tickOnce, getHealth, _runTickAndRecord };
