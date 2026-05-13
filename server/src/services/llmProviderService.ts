import crypto from 'crypto';
import { adminDb } from './domainDb';
import { config } from '../config/env';

export type LlmProvider = 'openai' | 'gemini' | 'together';

export interface LlmCallResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ActiveLlmConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  source: 'db' | 'env';
}

interface ProviderConfigRow {
  id: string;
  kind: 'llm' | 'email';
  provider: string;
  model: string | null;
  api_key_enc: string;
  api_key_last4: string;
  from_email: string | null;
  from_name: string | null;
  is_default: boolean;
  is_active: boolean;
}

// AES-256-GCM encrypted blob layout: salt(16) | iv(12) | tag(16) | ciphertext
// PBKDF2-SHA256(PROVIDER_CONFIG_SECRET, salt, 100000) → 32-byte key.
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KDF_ITERATIONS = 100_000;

function getSecret(): string {
  const s = process.env.PROVIDER_CONFIG_SECRET || process.env.JWT_SECRET || '';
  if (!s) throw new Error('PROVIDER_CONFIG_SECRET (or JWT_SECRET fallback) is required to encrypt/decrypt provider keys');
  return s;
}

export function encryptApiKey(plaintext: string): string {
  const secret = getSecret();
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = crypto.pbkdf2Sync(secret, salt, KDF_ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ct]).toString('base64');
}

export function decryptApiKey(blob: string): string {
  const secret = getSecret();
  const buf = Buffer.from(blob, 'base64');
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const ct = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = crypto.pbkdf2Sync(secret, salt, KDF_ITERATIONS, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function maskApiKey(plaintext: string): string {
  const last4 = plaintext.slice(-4);
  return `****${last4}`;
}

export function lastFour(plaintext: string): string {
  return plaintext.slice(-4);
}

/**
 * Defaults used when no admin override is configured. Existing behaviour
 * (togetherApiService.ts) reads the same env vars directly, so the fallback
 * leaves AI features working out of the box without an admin login.
 */
function envDefaultLlm(): ActiveLlmConfig {
  return {
    provider: 'together',
    model: config.together.textModel,
    apiKey: config.together.apiKey,
    source: 'env',
  };
}

export async function getActiveLlmProvider(): Promise<ActiveLlmConfig> {
  try {
    const row = await adminDb.queryOne<ProviderConfigRow>(
      `SELECT id, kind, provider, model, api_key_enc, api_key_last4,
              from_email, from_name, is_default, is_active
       FROM provider_config
       WHERE kind = 'llm' AND is_default = true AND is_active = true
       LIMIT 1`
    );
    if (!row) return envDefaultLlm();
    let apiKey: string;
    try {
      apiKey = decryptApiKey(row.api_key_enc);
    } catch {
      // Stored key can't be decrypted (e.g. PROVIDER_CONFIG_SECRET rotated) — fall back.
      return envDefaultLlm();
    }
    if (!apiKey) return envDefaultLlm();
    return {
      provider: row.provider as LlmProvider,
      model: row.model || defaultModelFor(row.provider as LlmProvider),
      apiKey,
      source: 'db',
    };
  } catch (err) {
    console.error('getActiveLlmProvider: DB lookup failed, falling back to env', err);
    return envDefaultLlm();
  }
}

export function defaultModelFor(provider: LlmProvider): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-mini';
    case 'gemini': return 'gemini-1.5-flash';
    case 'together': return config.together.textModel;
  }
}

// ── Provider-specific call adapters ──

async function callOpenAi(apiKey: string, model: string, messages: any[], maxTokens: number, jsonMode: boolean): Promise<LlmCallResult> {
  const body: any = {
    model,
    messages,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data: any = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('OpenAI returned no choices');
  return {
    content: choice.message?.content || '',
    model: data.model || model,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callTogether(apiKey: string, model: string, messages: any[], maxTokens: number): Promise<LlmCallResult> {
  const res = await fetch(`${config.together.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`Together ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data: any = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('Together returned no choices');
  return {
    content: choice.message?.content || '',
    model: data.model || model,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callGemini(apiKey: string, model: string, messages: any[], maxTokens: number, jsonMode: boolean): Promise<LlmCallResult> {
  // Map OpenAI-style messages to Gemini's content shape. System messages become
  // a leading system_instruction; user/assistant alternate as roles user/model.
  const systemMsgs = messages.filter(m => m.role === 'system').map(m => ({ text: typeof m.content === 'string' ? m.content : String(m.content || '') }));
  const turns = messages.filter(m => m.role !== 'system').map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : String(m.content || '') }],
  }));
  const body: any = {
    contents: turns,
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (systemMsgs.length) body.systemInstruction = { parts: systemMsgs };
  if (jsonMode) body.generationConfig.responseMimeType = 'application/json';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data: any = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini returned no candidates');
  const textParts = (candidate.content?.parts || []).map((p: any) => p.text || '').join('');
  return {
    content: textParts,
    model,
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  };
}

export async function chatCompletion(opts: {
  messages: any[];
  maxTokens?: number;
  jsonMode?: boolean;
  /** Override the active provider — used by testConnection. */
  override?: { provider: LlmProvider; apiKey: string; model?: string };
}): Promise<LlmCallResult> {
  const maxTokens = opts.maxTokens ?? 800;
  const jsonMode = opts.jsonMode ?? false;

  let provider: LlmProvider;
  let model: string;
  let apiKey: string;

  if (opts.override) {
    provider = opts.override.provider;
    apiKey = opts.override.apiKey;
    model = opts.override.model || defaultModelFor(provider);
  } else {
    const active = await getActiveLlmProvider();
    provider = active.provider;
    apiKey = active.apiKey;
    model = active.model;
  }

  switch (provider) {
    case 'openai':   return callOpenAi(apiKey, model, opts.messages, maxTokens, jsonMode);
    case 'gemini':   return callGemini(apiKey, model, opts.messages, maxTokens, jsonMode);
    case 'together': return callTogether(apiKey, model, opts.messages, maxTokens);
  }
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  model?: string;
}

/**
 * Validate an LLM provider's credentials by issuing a minimal probe call.
 * Never throws — always returns the result.
 */
export async function testConnection(provider: LlmProvider, apiKey: string, model?: string): Promise<TestConnectionResult> {
  const started = Date.now();
  try {
    const r = await chatCompletion({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 4,
      override: { provider, apiKey, model },
    });
    return { success: true, latencyMs: Date.now() - started, model: r.model };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - started, error: err?.message || String(err) };
  }
}
