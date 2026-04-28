import { biddingDb } from '../domainDb';
import sgMail from '@sendgrid/mail';
import { config } from '../../config/env';

/**
 * Email dispatcher — drains bidding.email_outbox in batches via SendGrid.
 * Runs in-process per TK-2711.
 */

if (config.sendgrid.apiKey) sgMail.setApiKey(config.sendgrid.apiKey);

const BATCH_SIZE = parseInt(process.env.EMAIL_DISPATCHER_BATCH_SIZE || '50', 10);
const MAX_ATTEMPTS = parseInt(process.env.EMAIL_DISPATCHER_MAX_ATTEMPTS || '5', 10);

export async function queue(toEmail: string, subject: string, html: string, opts: { templateKey?: string; toUserId?: string; text?: string } = {}) {
  await biddingDb.query(
    `INSERT INTO email_outbox (template_key, to_email, to_user_id, subject, html, text, status)
     VALUES ($1,$2,$3,$4,$5,$6,'queued')`,
    [opts.templateKey || null, toEmail, opts.toUserId || null, subject, html, opts.text || null]
  );
}

export async function tickOnce(): Promise<{ sent: number; failed: number; skipped: number }> {
  const rows = await biddingDb.queryAll<any>(
    `SELECT id, template_key, to_email, subject, html, text, attempts FROM email_outbox
      WHERE status = 'queued' ORDER BY queued_at FOR UPDATE SKIP LOCKED LIMIT $1`,
    [BATCH_SIZE]
  );
  let sent = 0, failed = 0, skipped = 0;
  for (const row of rows) {
    if (!config.sendgrid.apiKey) { skipped++; continue; }
    try {
      const result = await sgMail.send({
        to: row.to_email,
        from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
        subject: row.subject,
        html: row.html,
        text: row.text || undefined,
      });
      const messageId = (result as any)?.[0]?.headers?.['x-message-id'] || null;
      await biddingDb.query(
        `UPDATE email_outbox SET status = 'sent', sent_at = NOW(), provider_message_id = $2 WHERE id = $1`,
        [row.id, messageId]
      );
      sent++;
    } catch (err: any) {
      const attempts = Number(row.attempts || 0) + 1;
      const finalStatus = attempts >= MAX_ATTEMPTS ? 'dead_lettered' : 'queued';
      await biddingDb.query(
        `UPDATE email_outbox SET status = $2, attempts = $3, last_error = $4 WHERE id = $1`,
        [row.id, finalStatus, attempts, String(err?.message || err).slice(0, 500)]
      );
      failed++;
    }
  }
  return { sent, failed, skipped };
}

let lastTick = 0;
let lastTickSent = 0;

export async function _runTickAndRecord() {
  const r = await tickOnce();
  lastTick = Date.now();
  lastTickSent = r.sent;
  return r;
}

export async function getHealth() {
  const queued = await biddingDb.queryOne<{ count: string }>(`SELECT COUNT(*)::TEXT AS count FROM email_outbox WHERE status = 'queued'`);
  return {
    last_tick_at: lastTick ? new Date(lastTick).toISOString() : null,
    last_tick_sent: lastTickSent,
    queued_count: Number(queued?.count ?? 0),
  };
}

export const emailDispatcher = { queue, tickOnce, getHealth, _runTickAndRecord };
