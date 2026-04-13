import { authDb, projectDb, adminDb, biddingDb } from './domainDb';

/**
 * Get users filtered by role with pagination and search
 */
export async function getUsers(filters: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.role) { conditions.push(`role = $${idx++}`); values.push(filters.role); }
    if (filters.search) {
      conditions.push(`(email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit);
    values.push(offset);

    const users = await authDb.queryAll(
      `SELECT id, email, first_name, last_name, phone, role, is_onboarded, is_email_verified, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    const countResult = await authDb.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${where}`,
      values.slice(0, -2)
    );

    return { users, total: parseInt(countResult?.count || '0'), page, limit };
  } catch (error) { console.error('Get users error:', error); throw error; }
}

/**
 * Get user stats grouped by role
 */
export async function getUserStats() {
  try {
    const stats = await authDb.queryAll<{ role: string; count: string }>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    return stats.reduce((acc: any, s) => { acc[s.role] = parseInt(s.count); return acc; }, {});
  } catch (error) { console.error('Get user stats error:', error); throw error; }
}

/**
 * Get user by ID (full profile)
 */
export async function getUserById(userId: string) {
  try {
    return await authDb.queryOne(
      `SELECT id, email, first_name, last_name, phone, role, is_onboarded, is_email_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );
  } catch (error) { console.error('Get user error:', error); throw error; }
}

/**
 * Activate or deactivate a user account
 */
export async function updateUserStatus(userId: string, isActive: boolean) {
  try {
    return await authDb.queryOne(
      'UPDATE users SET is_email_verified = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email, first_name, last_name, role, is_email_verified',
      [userId, isActive]
    );
  } catch (error) { console.error('Update user status error:', error); throw error; }
}

// ── Bid Price Rules ──

export async function getBidPriceRules() {
  try {
    return await projectDb.queryAll(
      'SELECT * FROM bid_price_rules ORDER BY job_category NULLS FIRST, effective_date DESC'
    );
  } catch (error) { console.error('Get bid price rules error:', error); throw error; }
}

export async function createBidPriceRule(data: { job_category?: string; min_price_percentage: number; created_by: string }) {
  try {
    return await projectDb.queryOne(
      `INSERT INTO bid_price_rules (job_category, min_price_percentage, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.job_category || null, data.min_price_percentage, data.created_by]
    );
  } catch (error) { console.error('Create bid price rule error:', error); throw error; }
}

export async function updateBidPriceRule(ruleId: string, data: { min_price_percentage: number }) {
  try {
    return await projectDb.queryOne(
      'UPDATE bid_price_rules SET min_price_percentage = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [ruleId, data.min_price_percentage]
    );
  } catch (error) { console.error('Update bid price rule error:', error); throw error; }
}

export async function deleteBidPriceRule(ruleId: string) {
  try {
    return await projectDb.queryOne(
      'DELETE FROM bid_price_rules WHERE id = $1 AND job_category IS NOT NULL RETURNING *',
      [ruleId]
    );
  } catch (error) { console.error('Delete bid price rule error:', error); throw error; }
}

// ── Analytics ──

export async function getPriceVarianceAnalytics(filters: { from?: string; to?: string; category?: string }) {
  try {
    const conditions: string[] = ['st.owner_start_price IS NOT NULL'];
    const values: any[] = [];
    let idx = 1;

    if (filters.from) { conditions.push(`p.created_at >= $${idx++}`); values.push(filters.from); }
    if (filters.to) { conditions.push(`p.created_at <= $${idx++}`); values.push(filters.to); }
    if (filters.category) { conditions.push(`p.category = $${idx++}`); values.push(filters.category); }

    const where = conditions.join(' AND ');

    const result = await projectDb.queryAll(
      `SELECT p.category,
              COUNT(DISTINCT p.id) AS project_count,
              AVG(st.owner_start_price - st.cost_min) AS avg_price_variance,
              AVG(st.owner_start_price) AS avg_owner_price,
              AVG(st.cost_min) AS avg_ai_price
       FROM scope_tasks st
       JOIN projects p ON p.id = st.project_id
       WHERE ${where}
       GROUP BY p.category
       ORDER BY p.category`,
      values
    );
    return result;
  } catch (error) { console.error('Get price variance analytics error:', error); throw error; }
}

// ── Subscriptions ──

export async function getSubscriptions(filters: { plan?: string; status?: string; page?: number; limit?: number }) {
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.plan) { conditions.push(`sp.name = $${idx++}`); values.push(filters.plan); }
    if (filters.status) { conditions.push(`s.status = $${idx++}`); values.push(filters.status); }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit);
    values.push(offset);

    return await adminDb.queryAll(
      `SELECT s.*, sp.name AS plan_name, sp.price AS plan_price
       FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id
       ${where} ORDER BY s.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );
  } catch (error) { console.error('Get subscriptions error:', error); throw error; }
}

export async function getSubscriptionStats() {
  try {
    const stats = await adminDb.queryAll<{ plan_name: string; status: string; count: string }>(
      `SELECT sp.name AS plan_name, s.status, COUNT(*) AS count
       FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id
       GROUP BY sp.name, s.status`
    );
    return stats;
  } catch (error) { console.error('Get subscription stats error:', error); throw error; }
}

export async function updateSubscription(subscriptionId: string, data: { plan_id?: string; status?: string }) {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.plan_id) { fields.push(`plan_id = $${idx++}`); values.push(data.plan_id); }
    if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    values.push(subscriptionId);

    return await adminDb.queryOne(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  } catch (error) { console.error('Update subscription error:', error); throw error; }
}

export async function getSubscriptionPlans() {
  try { return await adminDb.queryAll('SELECT * FROM subscription_plans ORDER BY price'); }
  catch (error) { console.error('Get plans error:', error); throw error; }
}

export async function createSubscriptionPlan(data: { name: string; price: number; features: any[]; billing_cycle: string }) {
  try {
    return await adminDb.queryOne(
      'INSERT INTO subscription_plans (name, price, features, billing_cycle) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.name, data.price, JSON.stringify(data.features || []), data.billing_cycle]
    );
  } catch (error) { console.error('Create plan error:', error); throw error; }
}

export async function getPlatformUsageAnalytics() {
  try {
    const userCount = await authDb.queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM users');
    const projectCount = await projectDb.queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM projects');
    const bidCount = await biddingDb.queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM bids');
    return {
      total_users: parseInt(userCount?.count || '0'),
      total_projects: parseInt(projectCount?.count || '0'),
      total_bids: parseInt(bidCount?.count || '0'),
    };
  } catch (error) { console.error('Get platform usage error:', error); throw error; }
}

export async function getContractAllocationAnalytics() {
  try {
    const totalBids = await biddingDb.queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM bids');
    const acceptedBids = await biddingDb.queryOne<{ count: string }>("SELECT COUNT(*) AS count FROM bids WHERE status = 'accepted'");
    const total = parseInt(totalBids?.count || '0');
    const accepted = parseInt(acceptedBids?.count || '0');
    return {
      total_bids: total,
      accepted_bids: accepted,
      conversion_rate: total > 0 ? (accepted / total * 100).toFixed(1) : '0.0',
    };
  } catch (error) { console.error('Get contract allocation error:', error); throw error; }
}

export const adminService = {
  getUsers, getUserStats, getUserById, updateUserStatus,
  getBidPriceRules, createBidPriceRule, updateBidPriceRule, deleteBidPriceRule,
  getPriceVarianceAnalytics, getPlatformUsageAnalytics, getContractAllocationAnalytics,
  getSubscriptions, getSubscriptionStats, updateSubscription, getSubscriptionPlans, createSubscriptionPlan,
};
