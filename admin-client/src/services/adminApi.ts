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
