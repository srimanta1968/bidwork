import { biddingDb, projectDb, authDb } from './domainDb';

/**
 * Tracks the post-deposit visit-confirmation flow:
 *   pending_first_check → reminder_sent → pending_second_check → owner_marked_abandoned
 *                                                        \→ visit_confirmed (terminal)
 *
 * The homeowner is asked to confirm the contractor visited and discussed the
 * work. If No on the first check, the homeowner can send a reminder; if No
 * again on the second check, they can mark the workorder abandoned, which
 * triggers the existing FT-855 credit transfer to the next-ranked bidder.
 */

interface VisitContext {
  bid: { id: string; project_id: string; contractor_id: string; selection_workflow_state: string };
  contract: { proposed_start_date: string | null; proposed_end_date: string | null } | null;
  visit: { bid_id: string; status: string; reminder_sent_at: string | null; reminder_count: number; last_check_at: string | null; abandoned_at: string | null } | null;
  isOwner: boolean;
}

async function loadContext(bidId: string, viewerUserId: string): Promise<VisitContext> {
  const bid = await biddingDb.queryOne<any>('SELECT id, project_id, contractor_id, selection_workflow_state FROM bids WHERE id = $1', [bidId]);
  if (!bid) throw new Error('Bid not found');
  const project = await projectDb.queryOne<{ homeowner_id: string }>('SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]);
  if (!project) throw new Error('Project not found');
  const isOwner = project.homeowner_id === viewerUserId;
  if (!isOwner) throw new Error('Not authorized');
  const contract = await biddingDb.queryOne<any>('SELECT proposed_start_date, proposed_end_date FROM contracts WHERE bid_id = $1', [bidId]);
  const visit = await biddingDb.queryOne<any>('SELECT * FROM workorder_visits WHERE bid_id = $1', [bidId]);
  return { bid, contract, visit, isOwner };
}

function startDatePassed(contract: VisitContext['contract']): boolean {
  if (!contract?.proposed_start_date) return false;
  const start = new Date(contract.proposed_start_date + 'T00:00:00Z');
  return Date.now() >= start.getTime();
}

export async function getStatus(bidId: string, viewerUserId: string) {
  const ctx = await loadContext(bidId, viewerUserId);
  const passed = startDatePassed(ctx.contract);
  const visit = ctx.visit;
  // The first check only opens once we are at-or-past start_date and the bid is in 'scheduled'.
  const can_confirm_visit = passed && ctx.bid.selection_workflow_state === 'scheduled' && (visit?.status === 'pending_first_check' || visit?.status === 'pending_second_check' || !visit);
  const can_send_reminder = passed && visit?.status === 'reminder_sent';
  const can_abandon = passed && visit?.status === 'pending_second_check';
  return {
    bid_id: bidId,
    workflow_state: ctx.bid.selection_workflow_state,
    proposed_start_date: ctx.contract?.proposed_start_date || null,
    proposed_end_date: ctx.contract?.proposed_end_date || null,
    start_date_passed: passed,
    visit_status: visit?.status || (passed ? 'pending_first_check' : 'awaiting_start_date'),
    reminder_sent_at: visit?.reminder_sent_at || null,
    reminder_count: visit?.reminder_count || 0,
    last_check_at: visit?.last_check_at || null,
    abandoned_at: visit?.abandoned_at || null,
    can_confirm_visit,
    can_send_reminder,
    can_abandon,
  };
}

async function appendAudit(bidId: string, event: { action: string; by_user: string; meta?: any }) {
  await biddingDb.query(
    `INSERT INTO workorder_visits (bid_id, status, audit) VALUES ($1, 'pending_first_check', jsonb_build_array($2::jsonb))
       ON CONFLICT (bid_id) DO UPDATE SET audit = workorder_visits.audit || $2::jsonb, updated_at = NOW()`,
    [bidId, JSON.stringify({ ...event, at: new Date().toISOString() })]
  );
}

export async function confirmVisit(bidId: string, viewerUserId: string, visited: boolean) {
  const ctx = await loadContext(bidId, viewerUserId);
  if (!startDatePassed(ctx.contract)) throw new Error('You can confirm the visit only on or after the agreed start date');
  // Ensure a row exists.
  await biddingDb.query(
    `INSERT INTO workorder_visits (bid_id, status) VALUES ($1, 'pending_first_check') ON CONFLICT (bid_id) DO NOTHING`,
    [bidId]
  );
  if (visited) {
    await biddingDb.query(
      `UPDATE workorder_visits SET status = 'visit_confirmed', last_check_at = NOW(), updated_at = NOW() WHERE bid_id = $1`,
      [bidId]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'in_progress', updated_at = NOW()
        WHERE id = $1 AND selection_workflow_state IN ('scheduled','addresses_revealed')`,
      [bidId]
    );
    await appendAudit(bidId, { action: 'visit_confirmed', by_user: viewerUserId });
    return await getStatus(bidId, viewerUserId);
  }
  // Owner answered "No". Advance from pending_first_check → reminder_sent
  // (i.e. the homeowner is now offered the reminder action). If we are
  // already past the reminder, flip pending_second_check (no further auto
  // transition) — the actual abandon needs the explicit abandon endpoint.
  const cur = await biddingDb.queryOne<{ status: string }>('SELECT status FROM workorder_visits WHERE bid_id = $1', [bidId]);
  if (cur?.status === 'pending_first_check') {
    await biddingDb.query(
      `UPDATE workorder_visits SET status = 'reminder_sent', last_check_at = NOW(), updated_at = NOW() WHERE bid_id = $1`,
      [bidId]
    );
  } else if (cur?.status === 'pending_second_check') {
    await biddingDb.query(
      `UPDATE workorder_visits SET last_check_at = NOW(), updated_at = NOW() WHERE bid_id = $1`,
      [bidId]
    );
  }
  await appendAudit(bidId, { action: 'visit_not_confirmed', by_user: viewerUserId, meta: { previous_status: cur?.status } });
  return await getStatus(bidId, viewerUserId);
}

export async function sendReminder(bidId: string, viewerUserId: string) {
  const ctx = await loadContext(bidId, viewerUserId);
  if (!startDatePassed(ctx.contract)) throw new Error('Reminders are available only after the agreed start date');
  const cur = await biddingDb.queryOne<{ status: string; reminder_count: number }>('SELECT status, reminder_count FROM workorder_visits WHERE bid_id = $1', [bidId]);
  if (!cur || cur.status !== 'reminder_sent') throw new Error('A reminder is not available at this stage');
  // Queue the reminder email to the contractor.
  const project = await projectDb.queryOne<{ title: string }>('SELECT title FROM projects WHERE id = $1', [ctx.bid.project_id]);
  const contractor = await authDb.queryOne<{ email: string; first_name: string | null }>(
    `SELECT email, first_name FROM users WHERE id = $1`, [ctx.bid.contractor_id]
  );
  if (contractor?.email) {
    await biddingDb.query(
      `INSERT INTO email_outbox (template_key, to_email, subject, html, status)
         VALUES ('contractor_visit_reminder', $1, $2, $3, 'queued')`,
      [
        contractor.email,
        `Reminder: please contact the homeowner for "${project?.title || 'your scheduled work'}"`,
        `<p>Hi ${contractor.first_name || 'there'},</p><p>The homeowner has not yet seen you visit and discuss the agreed work for <strong>${project?.title || 'this project'}</strong>. Please contact them and confirm a visit window as soon as possible. If the homeowner does not see a visit after this reminder, they may mark the workorder as abandoned and the deposit will be transferred as credit to the next-ranked bidder — without a cash refund.</p>`,
      ]
    );
  }
  await biddingDb.query(
    `UPDATE workorder_visits SET status = 'pending_second_check',
                                  reminder_sent_at = NOW(),
                                  reminder_count = reminder_count + 1,
                                  updated_at = NOW()
      WHERE bid_id = $1`,
    [bidId]
  );
  await appendAudit(bidId, { action: 'reminder_sent', by_user: viewerUserId });
  return await getStatus(bidId, viewerUserId);
}

export async function abandonAsNoShow(bidId: string, viewerUserId: string, ownerNote?: string) {
  const ctx = await loadContext(bidId, viewerUserId);
  if (!startDatePassed(ctx.contract)) throw new Error('Abandon is only available after the agreed start date');
  const cur = await biddingDb.queryOne<{ status: string }>('SELECT status FROM workorder_visits WHERE bid_id = $1', [bidId]);
  if (!cur || cur.status !== 'pending_second_check') throw new Error('Abandon is available only after a reminder has been sent and the contractor still did not respond');
  await biddingDb.query(
    `UPDATE workorder_visits SET status = 'owner_marked_abandoned', abandoned_at = NOW(), updated_at = NOW() WHERE bid_id = $1`,
    [bidId]
  );
  // Reuse the existing abandonOffer flow which already:
  //   - sets bid to 'abandoned'
  //   - revives sibling bids from 'paused' → 'pending'
  //   - increments contractor_profiles.abandonment_flag_count
  //   - converts the deposit into a credit scoped to (owner, project)
  const { abandonOffer } = await import('./bidService');
  await abandonOffer(bidId, ownerNote ? `No-show after reminder. Owner note: ${ownerNote}` : 'No-show after homeowner reminder');
  await appendAudit(bidId, { action: 'owner_marked_abandoned', by_user: viewerUserId, meta: { note: ownerNote || null } });
  return await getStatus(bidId, viewerUserId);
}

export const visitTrackingService = { getStatus, confirmVisit, sendReminder, abandonAsNoShow };
