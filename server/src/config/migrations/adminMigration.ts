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

    // ── v2: Platform service fee (append-only versioned config) ──
    // BidWork's only billable transaction is this fee, charged as the deposit
    // when a contractor accepts a bid. Admin can raise or lower the percent at
    // any time; historical deposits keep the percent in effect when collected.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.service_fee_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        percent NUMERIC(5, 4) NOT NULL CHECK (percent >= 0 AND percent <= 1),
        effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        set_by_admin_id UUID,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_service_fee_effective
      ON admin.service_fee_config (effective_from DESC)
    `);

    // Seed initial 5% rate if the table is empty
    await pool.query(`
      INSERT INTO admin.service_fee_config (percent, notes)
      SELECT 0.0500, 'Initial 5% platform service fee'
      WHERE NOT EXISTS (SELECT 1 FROM admin.service_fee_config)
    `);

    // ── v3: Provider config (LLM + Email) ──
    // admin-managed AI provider keys (OpenAI / Gemini / Together) and email
    // provider keys (SendGrid). Only one is_default per kind. AI features and
    // outbound email read the active row; missing/empty rows fall back to env.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.provider_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kind VARCHAR(16) NOT NULL,
        provider VARCHAR(32) NOT NULL,
        model VARCHAR(128),
        api_key_enc TEXT NOT NULL,
        api_key_last4 VARCHAR(8) NOT NULL DEFAULT '',
        from_email VARCHAR(255),
        from_name VARCHAR(128),
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_by_admin_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE admin.provider_config
          DROP CONSTRAINT IF EXISTS chk_provider_kind;
        ALTER TABLE admin.provider_config
          ADD CONSTRAINT chk_provider_kind CHECK (kind IN ('llm', 'email'));
        ALTER TABLE admin.provider_config
          DROP CONSTRAINT IF EXISTS chk_provider_name;
        ALTER TABLE admin.provider_config
          ADD CONSTRAINT chk_provider_name CHECK (provider IN ('openai', 'gemini', 'together', 'sendgrid'));
      END $$
    `);

    // Only one default per kind
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_default_per_kind
      ON admin.provider_config (kind)
      WHERE is_default = true AND is_active = true
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_kind_active
      ON admin.provider_config (kind, is_active)
    `);

    // Email send log (admin-initiated personal emails + test sends)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin.email_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_preview TEXT,
        sent_by_admin_id UUID,
        recipient_user_id UUID,
        provider VARCHAR(32) NOT NULL,
        status VARCHAR(16) NOT NULL,
        error TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE admin.email_log
          DROP CONSTRAINT IF EXISTS chk_email_log_status;
        ALTER TABLE admin.email_log
          ADD CONSTRAINT chk_email_log_status CHECK (status IN ('sent', 'failed'));
      END $$
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_log_admin_sent
      ON admin.email_log (sent_by_admin_id, sent_at DESC)
    `);

    console.log('[migrate:admin] Admin domain ready (v3: provider config + email log).');
  } catch (error) {
    console.error('[migrate:admin] Migration failed:', error);
    throw error;
  }
}
