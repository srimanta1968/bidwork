import { adminDb } from './domainDb';

export type FeedbackContext = 'general' | 'scope_review' | 'bid_review' | 'onboarding' | 'other';
export type FeedbackStatus = 'new' | 'reviewed' | 'replied';

const VALID_CONTEXTS: FeedbackContext[] = ['general', 'scope_review', 'bid_review', 'onboarding', 'other'];
const VALID_STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'replied'];

export interface FeedbackRow {
  id: string;
  user_id: string;
  project_id: string | null;
  context: string;
  message: string;
  status: FeedbackStatus;
  summary: string | null;
  replied_at: string | null;
  replied_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackWithSubmitter extends FeedbackRow {
  submitter_email: string | null;
  submitter_first_name: string | null;
  submitter_last_name: string | null;
}

export interface SubmitInput {
  user_id: string;
  message: string;
  context?: string;
  project_id?: string | null;
}

export async function submitFeedback(input: SubmitInput): Promise<FeedbackRow> {
  const message = (input.message || '').trim();
  if (!message) throw new Error('message is required');
  if (message.length > 2000) throw new Error('message must be 2000 chars or fewer');
  const context = (input.context || 'general').toLowerCase();
  if (!VALID_CONTEXTS.includes(context as FeedbackContext)) {
    throw new Error(`context must be one of ${VALID_CONTEXTS.join(', ')}`);
  }
  const row = await adminDb.queryOne<FeedbackRow>(
    `INSERT INTO customer_feedback (user_id, project_id, context, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.project_id || null, context, message]
  );
  if (!row) throw new Error('insert failed');
  return row;
}

export interface ListFilter {
  status?: FeedbackStatus;
  context?: string;
  project_id?: string;
  page?: number;
  limit?: number;
}

export async function listFeedback(filter: ListFilter): Promise<{ rows: FeedbackWithSubmitter[]; total: number; page: number; limit: number }> {
  const wheres: string[] = [];
  const params: any[] = [];
  if (filter.status) { params.push(filter.status); wheres.push(`f.status = $${params.length}`); }
  if (filter.context) { params.push(filter.context); wheres.push(`f.context = $${params.length}`); }
  if (filter.project_id) { params.push(filter.project_id); wheres.push(`f.project_id = $${params.length}`); }
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(200, Math.max(1, filter.limit || 50));
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  // Cross-schema read: customer_feedback in admin, users in auth. The pools
  // point at the same Postgres instance with different default search_paths,
  // so a fully-qualified join works through the admin pool.
  const rows = await adminDb.queryAll<FeedbackWithSubmitter>(
    `SELECT f.*,
            u.email      AS submitter_email,
            u.first_name AS submitter_first_name,
            u.last_name  AS submitter_last_name
       FROM customer_feedback f
       LEFT JOIN auth.users u ON u.id = f.user_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countRow = await adminDb.queryOne<{ count: string }>(
    `SELECT COUNT(*)::TEXT AS count FROM customer_feedback f ${where}`,
    params.slice(0, params.length - 2)
  );
  return { rows, total: parseInt(countRow?.count || '0', 10), page, limit };
}

export async function setStatus(id: string, status: FeedbackStatus, adminId: string): Promise<FeedbackRow | null> {
  if (!VALID_STATUSES.includes(status)) throw new Error(`status must be one of ${VALID_STATUSES.join(', ')}`);
  const repliedAt = status === 'replied' ? 'NOW()' : 'NULL';
  return adminDb.queryOne<FeedbackRow>(
    `UPDATE customer_feedback
        SET status = $2,
            replied_at = ${repliedAt},
            replied_by_admin_id = CASE WHEN $2 = 'replied' THEN $3 ELSE replied_by_admin_id END,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, status, adminId]
  );
}

export async function getMessagesForSummary(filter: { ids?: string[]; status?: FeedbackStatus; context?: string }): Promise<string[]> {
  if (filter.ids && filter.ids.length > 0) {
    const rows = await adminDb.queryAll<{ message: string }>(
      `SELECT message FROM customer_feedback WHERE id = ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 500`,
      [filter.ids]
    );
    return rows.map(r => r.message);
  }
  const wheres: string[] = [];
  const params: any[] = [];
  if (filter.status) { params.push(filter.status); wheres.push(`status = $${params.length}`); }
  if (filter.context) { params.push(filter.context); wheres.push(`context = $${params.length}`); }
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const rows = await adminDb.queryAll<{ message: string }>(
    `SELECT message FROM customer_feedback ${where} ORDER BY created_at DESC LIMIT 500`,
    params
  );
  return rows.map(r => r.message);
}
