const API = '/api/admin';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('bidwork_admin_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// Auth
export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return res.json();
}

// Users
export async function getUsers(params: { role?: string; search?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.role) qs.set('role', params.role);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`${API}/users?${qs}`, { headers: authHeaders() });
  return res.json();
}

export async function getUserStats() {
  const res = await fetch(`${API}/users/stats`, { headers: authHeaders() });
  return res.json();
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const res = await fetch(`${API}/users/${userId}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_active: isActive }) });
  return res.json();
}

// Rules
export async function getBidPriceRules() {
  const res = await fetch(`${API}/rules/bid-price`, { headers: authHeaders() });
  return res.json();
}

export async function createBidPriceRule(data: { job_category?: string; min_price_percentage: number }) {
  const res = await fetch(`${API}/rules/bid-price`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function updateBidPriceRule(ruleId: string, data: { min_price_percentage: number }) {
  const res = await fetch(`${API}/rules/bid-price/${ruleId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function deleteBidPriceRule(ruleId: string) {
  const res = await fetch(`${API}/rules/bid-price/${ruleId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

// Subscriptions
export async function getSubscriptions(params: { page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  const res = await fetch(`${API}/subscriptions?${qs}`, { headers: authHeaders() });
  return res.json();
}

export async function getSubscriptionStats() {
  const res = await fetch(`${API}/subscriptions/stats`, { headers: authHeaders() });
  return res.json();
}

export async function getSubscriptionPlans() {
  const res = await fetch(`${API}/subscription-plans`, { headers: authHeaders() });
  return res.json();
}

export async function createSubscriptionPlan(data: { name: string; price: number; billing_cycle: string; features: string[] }) {
  const res = await fetch(`${API}/subscription-plans`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

// Analytics
export async function getPriceVariance(params: { from?: string; to?: string; category?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.category) qs.set('category', params.category);
  const res = await fetch(`${API}/analytics/price-variance?${qs}`, { headers: authHeaders() });
  return res.json();
}

export async function getPlatformUsage() {
  const res = await fetch(`${API}/analytics/platform-usage`, { headers: authHeaders() });
  return res.json();
}

export async function getContractAllocation() {
  const res = await fetch(`${API}/analytics/contract-allocation`, { headers: authHeaders() });
  return res.json();
}

// Platform service fee
export async function getCurrentServiceFee() {
  const res = await fetch(`${API}/service-fee/current`, { headers: authHeaders() });
  return res.json();
}

export async function getServiceFeeHistory(limit = 50) {
  const res = await fetch(`${API}/service-fee/history?limit=${limit}`, { headers: authHeaders() });
  return res.json();
}

export async function setServiceFee(data: { percent: number; effective_from?: string; notes?: string }) {
  const res = await fetch(`${API}/service-fee`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

// Dashboard summary
export async function getDashboardStats() {
  const res = await fetch(`${API}/stats`, { headers: authHeaders() });
  return res.json();
}

// ── Provider config (LLM + Email) ──
export type ProviderKind = 'llm' | 'email';
export type ProviderName = 'openai' | 'gemini' | 'together' | 'sendgrid';

export interface ProviderConfig {
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

export async function listProviders(kind?: ProviderKind) {
  const qs = kind ? `?kind=${kind}` : '';
  const res = await fetch(`${API}/providers${qs}`, { headers: authHeaders() });
  return res.json();
}

export async function upsertProvider(data: {
  kind: ProviderKind;
  provider: ProviderName;
  model?: string;
  api_key: string;
  from_email?: string;
  from_name?: string;
  is_default?: boolean;
}) {
  const res = await fetch(`${API}/providers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function setDefaultProvider(id: string) {
  const res = await fetch(`${API}/providers/${id}/default`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function deleteProvider(id: string) {
  const res = await fetch(`${API}/providers/${id}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

export async function testLlmConnection(data: { provider: ProviderName; api_key: string; model?: string }) {
  const res = await fetch(`${API}/providers/test-llm`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function testEmailProvider(data: { provider: ProviderName; api_key: string; from_email: string; from_name?: string; to: string }) {
  const res = await fetch(`${API}/providers/test-email`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function sendUserEmail(userId: string, data: { subject: string; body: string }) {
  const res = await fetch(`${API}/users/${userId}/email`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}
