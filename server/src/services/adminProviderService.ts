import { adminDb } from './domainDb';
import { encryptApiKey, lastFour, maskApiKey } from './llmProviderService';

export type ProviderKind = 'llm' | 'email';
export type ProviderName = 'openai' | 'gemini' | 'together' | 'sendgrid';

export interface ProviderConfigRow {
  id: string;
  kind: ProviderKind;
  provider: ProviderName;
  model: string | null;
  api_key_enc: string;
  api_key_last4: string;
  from_email: string | null;
  from_name: string | null;
  is_default: boolean;
  is_active: boolean;
  updated_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderConfigPublic {
  id: string;
  kind: ProviderKind;
  provider: ProviderName;
  model: string | null;
  api_key_masked: string;
  api_key_last4: string;
  from_email: string | null;
  from_name: string | null;
  is_default: boolean;
  is_active: boolean;
  updated_at: string;
}

function toPublic(row: ProviderConfigRow): ProviderConfigPublic {
  return {
    id: row.id,
    kind: row.kind,
    provider: row.provider,
    model: row.model,
    api_key_masked: `****${row.api_key_last4 || ''}`,
    api_key_last4: row.api_key_last4 || '',
    from_email: row.from_email,
    from_name: row.from_name,
    is_default: row.is_default,
    is_active: row.is_active,
    updated_at: row.updated_at,
  };
}

const VALID_KINDS: ProviderKind[] = ['llm', 'email'];
const VALID_LLM_PROVIDERS: ProviderName[] = ['openai', 'gemini', 'together'];
const VALID_EMAIL_PROVIDERS: ProviderName[] = ['sendgrid'];

function assertValidKindProvider(kind: ProviderKind, provider: ProviderName) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`Invalid kind '${kind}'; expected one of ${VALID_KINDS.join(', ')}`);
  }
  const allowed = kind === 'llm' ? VALID_LLM_PROVIDERS : VALID_EMAIL_PROVIDERS;
  if (!allowed.includes(provider)) {
    throw new Error(`Invalid provider '${provider}' for kind '${kind}'; expected one of ${allowed.join(', ')}`);
  }
}

export async function listProviders(kind?: ProviderKind): Promise<ProviderConfigPublic[]> {
  const params: any[] = [];
  let where = `WHERE is_active = true`;
  if (kind) {
    params.push(kind);
    where += ` AND kind = $${params.length}`;
  }
  const rows = await adminDb.queryAll<ProviderConfigRow>(
    `SELECT id, kind, provider, model, api_key_enc, api_key_last4,
            from_email, from_name, is_default, is_active,
            updated_by_admin_id, created_at, updated_at
     FROM provider_config
     ${where}
     ORDER BY kind, provider`,
    params
  );
  return rows.map(toPublic);
}

export async function getProvider(id: string): Promise<ProviderConfigPublic | null> {
  const row = await adminDb.queryOne<ProviderConfigRow>(
    `SELECT id, kind, provider, model, api_key_enc, api_key_last4,
            from_email, from_name, is_default, is_active,
            updated_by_admin_id, created_at, updated_at
     FROM provider_config WHERE id = $1`,
    [id]
  );
  return row ? toPublic(row) : null;
}

export interface UpsertProviderInput {
  kind: ProviderKind;
  provider: ProviderName;
  model?: string | null;
  api_key: string;
  from_email?: string | null;
  from_name?: string | null;
  is_default?: boolean;
  updated_by_admin_id: string;
}

/**
 * Upsert by (kind, provider). The first row for a kind becomes default
 * automatically. If `is_default` is set true, all other rows for the same kind
 * are demoted in the same transaction so only one is_default=true per kind.
 */
export async function upsertProvider(input: UpsertProviderInput): Promise<ProviderConfigPublic> {
  assertValidKindProvider(input.kind, input.provider);
  if (!input.api_key || input.api_key.length < 8) {
    throw new Error('api_key must be at least 8 characters');
  }
  const apiKeyEnc = encryptApiKey(input.api_key);
  const last4 = lastFour(input.api_key);

  const client = await adminDb.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path = admin, public`);

    const promoteToDefault = input.is_default ?? false;
    if (promoteToDefault) {
      await client.query(`UPDATE provider_config SET is_default = false WHERE kind = $1`, [input.kind]);
    }

    const existingRes = await client.query<{ id: string; is_default: boolean }>(
      `SELECT id, is_default FROM provider_config WHERE kind = $1 AND provider = $2 LIMIT 1`,
      [input.kind, input.provider]
    );
    const existing = existingRes.rows[0];

    const countRes = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM provider_config WHERE kind = $1`, [input.kind]
    );
    const isFirst = parseInt(countRes.rows[0]?.count || '0', 10) === 0;
    const finalDefault = promoteToDefault || isFirst || (existing?.is_default ?? false);

    let saved: ProviderConfigRow;
    if (existing) {
      const res = await client.query<ProviderConfigRow>(
        `UPDATE provider_config
         SET model = $2, api_key_enc = $3, api_key_last4 = $4,
             from_email = $5, from_name = $6, is_default = $7,
             is_active = true, updated_by_admin_id = $8, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [existing.id, input.model || null, apiKeyEnc, last4,
         input.from_email || null, input.from_name || null, finalDefault, input.updated_by_admin_id]
      );
      saved = res.rows[0];
    } else {
      const res = await client.query<ProviderConfigRow>(
        `INSERT INTO provider_config
           (kind, provider, model, api_key_enc, api_key_last4,
            from_email, from_name, is_default, is_active, updated_by_admin_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         RETURNING *`,
        [input.kind, input.provider, input.model || null, apiKeyEnc, last4,
         input.from_email || null, input.from_name || null, finalDefault, input.updated_by_admin_id]
      );
      saved = res.rows[0];
    }

    await client.query('COMMIT');
    return toPublic(saved);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function setDefault(id: string): Promise<ProviderConfigPublic> {
  const client = await adminDb.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path = admin, public`);

    const lookup = await client.query<ProviderConfigRow>(
      `SELECT id, kind, provider FROM provider_config WHERE id = $1 AND is_active = true LIMIT 1`,
      [id]
    );
    const row = lookup.rows[0];
    if (!row) throw new Error('Provider not found or inactive');

    await client.query(`UPDATE provider_config SET is_default = false WHERE kind = $1`, [row.kind]);
    const promoted = await client.query<ProviderConfigRow>(
      `UPDATE provider_config SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    return toPublic(promoted.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function softDelete(id: string): Promise<boolean> {
  const row = await adminDb.queryOne<{ id: string }>(
    `UPDATE provider_config SET is_active = false, is_default = false, updated_at = NOW()
     WHERE id = $1 AND is_active = true
     RETURNING id`,
    [id]
  );
  return !!row;
}

export { maskApiKey };
