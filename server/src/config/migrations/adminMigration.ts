import { Pool } from 'pg';

/**
 * Admin Domain Migration
 * Creates: admin.subscription_plans, admin.subscriptions, admin.billing_history
 * Admin portal tables for subscription and billing management.
 */
export async function runAdminMigration(pool: Pool): Promise<void> {
  console.log('[migrate:admin] Running admin domain migrations...');

  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS admin');

    // Subscription plans (e.g., Basic, Pro, Enterprise)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        features JSONB DEFAULT '[]',
        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE admin.subscription_plans
          DROP CONSTRAINT IF EXISTS chk_billing_cycle;
        ALTER TABLE admin.subscription_plans
          ADD CONSTRAINT chk_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime'));
      END $$
    `);

    // User subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        plan_id UUID NOT NULL REFERENCES admin.subscription_plans(id),
        status VARCHAR(20) NOT NULL DEFAULT 'trial',
        start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP WITH TIME ZONE,
        trial_end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE admin.subscriptions
          DROP CONSTRAINT IF EXISTS chk_subscription_status;
        ALTER TABLE admin.subscriptions
          ADD CONSTRAINT chk_subscription_status CHECK (status IN ('active', 'cancelled', 'trial', 'expired', 'past_due'));
      END $$
    `);

    // Billing history / invoices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.billing_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES admin.subscriptions(id),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        invoice_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE admin.billing_history
          DROP CONSTRAINT IF EXISTS chk_billing_status;
        ALTER TABLE admin.billing_history
          ADD CONSTRAINT chk_billing_status CHECK (status IN ('paid', 'pending', 'failed', 'refunded'));
      END $$
    `);

    // Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user
      ON admin.subscriptions (user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
      ON admin.subscriptions (plan_id, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_subscription
      ON admin.billing_history (subscription_id, invoice_date DESC)
    `);

    console.log('[migrate:admin] Admin domain ready.');
  } catch (error) {
    console.error('[migrate:admin] Migration failed:', error);
    throw error;
  }
}
