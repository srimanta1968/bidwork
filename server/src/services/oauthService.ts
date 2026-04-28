import crypto from 'crypto';

/**
 * OAuth state utility + provider config + token-exchange + profile-fetch.
 *
 * No passport dependency — direct HTTPS calls match the existing
 * stripe-direct pattern in depositService. Only Google + LinkedIn supported.
 */

export type Provider = 'google' | 'linkedin';
export type Intent = 'signup' | 'login';
export type Role = 'homeowner' | 'contractor' | 'skilled_labor';

const STATE_TTL_MS = 10 * 60 * 1000;

interface StatePayload {
  role?: Role;
  intent: Intent;
  nonce: string;
  ts: number;
}

function stateSecret(): string {
  return process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || 'dev-oauth-state-secret-change-me';
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = (4 - (s.length % 4)) % 4;
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad), 'base64');
}

export function signState(payload: Omit<StatePayload, 'nonce' | 'ts'>): string {
  const full: StatePayload = { ...payload, nonce: crypto.randomBytes(8).toString('hex'), ts: Date.now() };
  const body = b64urlEncode(Buffer.from(JSON.stringify(full)));
  const sig = b64urlEncode(crypto.createHmac('sha256', stateSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string): StatePayload {
  const [body, sig] = state.split('.');
  if (!body || !sig) throw new Error('Invalid OAuth state');
  const expected = b64urlEncode(crypto.createHmac('sha256', stateSecret()).update(body).digest());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('OAuth state signature mismatch');
  const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as StatePayload;
  if (Date.now() - payload.ts > STATE_TTL_MS) throw new Error('OAuth state expired — please retry');
  return payload;
}

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scopes: string;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: 'openid email profile',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  linkedin: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    // OpenID Connect userinfo on LinkedIn (requires the 'Sign In with LinkedIn using OpenID Connect' product).
    userinfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: 'openid email profile',
    clientId: () => process.env.LINKEDIN_CLIENT_ID,
    clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET,
  },
};

export function isProviderConfigured(p: Provider): boolean {
  const cfg = PROVIDERS[p];
  return !!(cfg && cfg.clientId() && cfg.clientSecret());
}

function redirectUriFor(provider: Provider, apiBase?: string): string {
  const base = apiBase || process.env.OAUTH_REDIRECT_BASE || `http://localhost:${process.env.PORT || 3000}`;
  return `${base.replace(/\/$/, '')}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: Provider, role: Role | undefined, intent: Intent, apiBase?: string): string {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unsupported OAuth provider '${provider}'`);
  if (!isProviderConfigured(provider)) throw new Error(`${provider} OAuth is not configured on this server`);
  const state = signState({ role, intent });
  const params = new URLSearchParams({
    client_id: cfg.clientId()!,
    redirect_uri: redirectUriFor(provider, apiBase),
    response_type: 'code',
    scope: cfg.scopes,
    state,
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(provider: Provider, code: string, apiBase?: string): Promise<{ accessToken: string; idToken?: string }> {
  const cfg = PROVIDERS[provider];
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: cfg.clientId()!,
    client_secret: cfg.clientSecret()!,
    redirect_uri: redirectUriFor(provider, apiBase),
  });
  const resp = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OAuth token exchange failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const data = await resp.json() as any;
  if (!data.access_token) throw new Error('OAuth token exchange returned no access_token');
  return { accessToken: data.access_token, idToken: data.id_token };
}

export interface OAuthProfile {
  provider_user_id: string;
  email: string | null;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  raw: any;
}

export async function fetchProfile(provider: Provider, accessToken: string): Promise<OAuthProfile> {
  const cfg = PROVIDERS[provider];
  const resp = await fetch(cfg.userinfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OAuth userinfo failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const raw = await resp.json() as any;
  // Google + LinkedIn (OIDC) both return: sub, email, email_verified, given_name, family_name, name, picture
  const sub = raw.sub || raw.id;
  if (!sub) throw new Error('OAuth profile missing subject id');
  return {
    provider_user_id: String(sub),
    email: raw.email || null,
    email_verified: !!raw.email_verified,
    first_name: raw.given_name || null,
    last_name: raw.family_name || null,
    display_name: raw.name || (raw.given_name && raw.family_name ? `${raw.given_name} ${raw.family_name}` : null),
    raw,
  };
}

export const oauthService = {
  signState,
  verifyState,
  isProviderConfigured,
  buildAuthorizeUrl,
  exchangeCode,
  fetchProfile,
};
