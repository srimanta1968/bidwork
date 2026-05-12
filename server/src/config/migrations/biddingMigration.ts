import { Pool } from 'pg';

/**
 * Bidding Domain Migration
 * Creates: bidding.bids
 * Safe to run on any deployment — only touches bidding schema
 */
export async function runBiddingMigration(pool: Pool): Promise<void> {
  console.log('[migrate:bidding] Running bidding domain migrations...');

  try {
  await pool.query('CREATE SCHEMA IF NOT EXISTS bidding');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bids (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      contractor_id UUID NOT NULL,
      bid_amount DECIMAL(10, 2) NOT NULL,
      estimated_days INTEGER NOT NULL,
      proposal_notes TEXT,
      contractor_name VARCHAR(200),
      contractor_category VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      accepted_at TIMESTAMP WITH TIME ZONE,
      rejected_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // One active bid per contractor per project
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_contractor_project
    ON bidding.bids (project_id, contractor_id)
    WHERE status != 'withdrawn'
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bids_project
    ON bidding.bids (project_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bids_contractor
    ON bidding.bids (contractor_id, created_at DESC)
  `);

  // ── v2: Bid Q&A system ──

  // Questions asked by contractors, moderated by AI before posting
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bid_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      contractor_id UUID NOT NULL,
      raw_question TEXT NOT NULL,
      sanitized_question TEXT,
      answer TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      answered_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // CHECK constraint for valid statuses
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.bid_questions
        DROP CONSTRAINT IF EXISTS chk_question_status;
      ALTER TABLE bidding.bid_questions
        ADD CONSTRAINT chk_question_status CHECK (status IN ('pending', 'posted', 'answered', 'rejected'));
    END $$
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bid_questions_project
    ON bidding.bid_questions (project_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bid_questions_contractor
    ON bidding.bid_questions (contractor_id, created_at DESC)
  `);

  // ── v3: Bid materials ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bid_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
      task_id UUID NOT NULL,
      catalog_item_id UUID NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10, 2),
      total DECIMAL(10, 2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bid_materials_bid
    ON bidding.bid_materials (bid_id)
  `);

  // ── v4: Per-task bid breakdown (labor + materials per task) ──
  // line_total is auto-computed; the service layer (bidService) keeps
  // materials_subtotal in sync with bid_materials totals after any insert
  // or delete via recomputeMaterialsSubtotalForBid(bidId).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bid_task_breakdown (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
      task_id UUID NOT NULL,
      labor_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
      materials_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
      line_total DECIMAL(12, 2) GENERATED ALWAYS AS (labor_cost + materials_subtotal) STORED,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_task_breakdown_unique
    ON bidding.bid_task_breakdown (bid_id, task_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bid_task_breakdown_bid
    ON bidding.bid_task_breakdown (bid_id)
  `);

  // ── v5: Payment transaction records (contractor-uploaded proof of payment) ──
  // Final payment moves outside BidWork — the contractor uploads a transaction
  // record to mark the project complete. Stored once per bid.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.payment_transaction_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL UNIQUE REFERENCES bidding.bids(id) ON DELETE CASCADE,
      contractor_id UUID NOT NULL,
      payment_method VARCHAR(40) NOT NULL,
      transaction_reference VARCHAR(255) NOT NULL,
      transaction_date DATE NOT NULL,
      transaction_amount_cents BIGINT NOT NULL CHECK (transaction_amount_cents > 0),
      proof_doc_s3_key VARCHAR(500) NOT NULL,
      proof_mime_type VARCHAR(100),
      proof_size_bytes BIGINT,
      contractor_notes TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.payment_transaction_records
        DROP CONSTRAINT IF EXISTS chk_payment_method;
      ALTER TABLE bidding.payment_transaction_records
        ADD CONSTRAINT chk_payment_method CHECK (
          payment_method IN ('stripe','paypal','bank_transfer','wire','check','cash','zelle','venmo','crypto','other')
        );
    END $$
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_records_contractor
    ON bidding.payment_transaction_records (contractor_id, uploaded_at DESC)
  `);

  // ── v5.5: Bid rejection reason + status audit fields ──
  for (const col of [
    "ALTER TABLE bidding.bids ADD COLUMN rejection_reason TEXT",
    "ALTER TABLE bidding.bids ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE bidding.bids ADD COLUMN status_updated_by UUID",
  ]) {
    await pool.query(`DO $$ BEGIN ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$`);
  }

  // ── v6: Selection workflow state (shortlist + Select & Notify) ──
  // Each bid gains a shortlist_rank (1..3) and a selection_workflow_state that
  // tracks where it sits in the contracting flow. Only one bid per (project, rank)
  // can hold a given rank. The state defaults to 'pending' which mirrors the
  // legacy bids.status='pending' behavior.
  for (const col of [
    "ALTER TABLE bidding.bids ADD COLUMN shortlist_rank SMALLINT",
    "ALTER TABLE bidding.bids ADD COLUMN selection_workflow_state VARCHAR(40) NOT NULL DEFAULT 'pending'",
    "ALTER TABLE bidding.bids ADD COLUMN approval_notified_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE bidding.bids ADD COLUMN approved_by_owner_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE bidding.bids ADD COLUMN abandoned_at TIMESTAMP WITH TIME ZONE",
  ]) {
    await pool.query(`DO $$ BEGIN ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$`);
  }

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.bids
        DROP CONSTRAINT IF EXISTS chk_shortlist_rank;
      ALTER TABLE bidding.bids
        ADD CONSTRAINT chk_shortlist_rank CHECK (shortlist_rank IS NULL OR (shortlist_rank BETWEEN 1 AND 3));
    END $$
  `);

  // At most one bid per rank per project
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_project_rank
    ON bidding.bids (project_id, shortlist_rank)
    WHERE shortlist_rank IS NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bids_workflow_state
    ON bidding.bids (project_id, selection_workflow_state)
  `);

  // chk_workflow_state is created by the v6.4 block below with the full
  // (extended) state list — see "Extend selection_workflow_state enum…".

  // ── v6.02a: Deposits + payment intents (Stripe escrow) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      bid_id UUID NOT NULL UNIQUE REFERENCES bidding.bids(id) ON DELETE CASCADE,
      contract_id UUID,
      amount_cents BIGINT NOT NULL,
      percent NUMERIC(5,4) NOT NULL DEFAULT 0.05,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      collected_at TIMESTAMP WITH TIME ZONE,
      converted_at TIMESTAMP WITH TIME ZONE,
      refunded_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.deposits
        DROP CONSTRAINT IF EXISTS chk_deposit_status;
      ALTER TABLE bidding.deposits
        ADD CONSTRAINT chk_deposit_status CHECK (
          status IN ('pending','collected','converted_to_fee','refunded','failed','available_as_credit')
        );
    END $$
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.payment_intents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deposit_id UUID NOT NULL REFERENCES bidding.deposits(id) ON DELETE CASCADE,
      provider VARCHAR(20) DEFAULT 'stripe',
      provider_intent_id VARCHAR(255) UNIQUE,
      client_secret_last4 VARCHAR(8),
      amount_cents BIGINT,
      status VARCHAR(30),
      raw_event JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_deposit ON bidding.payment_intents (deposit_id, status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposits_bid ON bidding.deposits (bid_id)`);

  // ── v6.02b: Two-tier receipts ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.service_fee_receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL UNIQUE REFERENCES bidding.bids(id) ON DELETE CASCADE,
      project_id UUID NOT NULL,
      deposit_id UUID,
      owner_id UUID NOT NULL,
      amount_cents BIGINT NOT NULL,
      percent_at_time NUMERIC(5,4) NOT NULL,
      receipt_pdf_s3_key VARCHAR(500),
      receipt_number VARCHAR(40) UNIQUE,
      issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      emailed_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.contractor_payment_receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL UNIQUE REFERENCES bidding.bids(id) ON DELETE CASCADE,
      project_id UUID NOT NULL,
      owner_id UUID NOT NULL,
      contractor_id UUID NOT NULL,
      contract_total_cents BIGINT NOT NULL,
      additional_work_total_cents BIGINT NOT NULL DEFAULT 0,
      grand_total_cents BIGINT NOT NULL,
      line_items JSONB DEFAULT '[]',
      receipt_pdf_s3_key VARCHAR(500),
      receipt_number VARCHAR(40) UNIQUE,
      issuer_legal_name VARCHAR(255) NOT NULL,
      issuer_ein VARCHAR(32),
      issuer_billing_address TEXT,
      issuer_billing_phone VARCHAR(40),
      issuer_signature_s3_key VARCHAR(500),
      issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      emailed_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sfr_bid ON bidding.service_fee_receipts (bid_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cpr_bid ON bidding.contractor_payment_receipts (bid_id)`);

  // ── v6.02c: Deposit credits ledger (abandonment → credit transfer) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.deposit_credits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL,
      project_id UUID NOT NULL,
      source_deposit_id UUID NOT NULL REFERENCES bidding.deposits(id) ON DELETE CASCADE,
      source_bid_id UUID NOT NULL,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      applied_to_bid_id UUID,
      applied_amount_cents BIGINT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      applied_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.deposit_credits
        DROP CONSTRAINT IF EXISTS chk_credit_status;
      ALTER TABLE bidding.deposit_credits
        ADD CONSTRAINT chk_credit_status CHECK (status IN ('available','partially_applied','fully_applied','expired'));
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposit_credits_lookup ON bidding.deposit_credits (owner_id, project_id, status)`);

  // ── v6.03: Contracts + signatures (legal work order document) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL UNIQUE REFERENCES bidding.bids(id) ON DELETE CASCADE,
      version INT NOT NULL DEFAULT 1,
      draft_pdf_s3_key VARCHAR(500),
      signed_pdf_s3_key VARCHAR(500),
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      finalized_at TIMESTAMP WITH TIME ZONE,
      audit_hash VARCHAR(128)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.contract_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id UUID NOT NULL REFERENCES bidding.contracts(id) ON DELETE CASCADE,
      signer_role VARCHAR(20) NOT NULL,
      signer_user_id UUID NOT NULL,
      typed_name VARCHAR(255) NOT NULL,
      signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ip_address INET,
      user_agent TEXT
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.contract_signatures
        DROP CONSTRAINT IF EXISTS chk_signer_role;
      ALTER TABLE bidding.contract_signatures
        ADD CONSTRAINT chk_signer_role CHECK (signer_role IN ('homeowner','contractor'));
    END $$
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_signatures_unique
    ON bidding.contract_signatures (contract_id, signer_role)
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contracts_bid ON bidding.contracts (bid_id)`);

  // ── v6.04: Private 1-on-1 bid messages (owner ↔ that bid's contractor) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bid_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
      sender_role VARCHAR(20) NOT NULL,
      sender_user_id UUID NOT NULL,
      raw_message TEXT NOT NULL,
      sanitized_message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.bid_messages
        DROP CONSTRAINT IF EXISTS chk_bid_msg_role;
      ALTER TABLE bidding.bid_messages
        ADD CONSTRAINT chk_bid_msg_role CHECK (sender_role IN ('homeowner','contractor'));
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bid_messages_thread ON bidding.bid_messages (bid_id, created_at)`);

  // ── v6.05: Bid attachments (proposal docs, certs, etc.) ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.bid_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      s3_key VARCHAR(500) NOT NULL UNIQUE,
      mime_type VARCHAR(100),
      size_bytes BIGINT,
      uploaded_by UUID NOT NULL,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bid_attachments_bid ON bidding.bid_attachments (bid_id)`);

  // ── v6.1: Additional work orders (recording-only, owner-acceptance gated) ──
  // Lets a contractor record extra work outside the original bid scope after a
  // contract is executed. No payments flow through BidWork on these — they
  // exist for itemization on the contractor's final receipt.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.additional_work_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
      contractor_id UUID NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      photo_evidence_keys TEXT[] DEFAULT '{}',
      owner_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      owner_response_notes TEXT,
      owner_signature_typed_name VARCHAR(255),
      owner_responded_at TIMESTAMP WITH TIME ZONE,
      contractor_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.additional_work_orders
        DROP CONSTRAINT IF EXISTS chk_awo_owner_status;
      ALTER TABLE bidding.additional_work_orders
        ADD CONSTRAINT chk_awo_owner_status CHECK (owner_status IN ('pending','accepted','rejected'));
    END $$
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_awo_bid_status
    ON bidding.additional_work_orders (bid_id, owner_status, contractor_submitted_at DESC)
  `);

  // ── v6.4: Schedule fields on contracts + legacy-accept backfill ──
  for (const col of [
    "ALTER TABLE bidding.contracts ADD COLUMN proposed_start_date DATE",
    "ALTER TABLE bidding.contracts ADD COLUMN proposed_end_date DATE",
    "ALTER TABLE bidding.contracts ADD COLUMN schedule_status VARCHAR(20) NOT NULL DEFAULT 'not_proposed'",
    "ALTER TABLE bidding.contracts ADD COLUMN schedule_proposed_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE bidding.contracts ADD COLUMN schedule_responded_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE bidding.contracts ADD COLUMN schedule_response_notes TEXT",
    "ALTER TABLE bidding.contracts ADD COLUMN schedule_owner_signature VARCHAR(255)",
  ]) {
    await pool.query(`DO $$ BEGIN ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$`);
  }
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.contracts DROP CONSTRAINT IF EXISTS chk_schedule_status;
      ALTER TABLE bidding.contracts ADD CONSTRAINT chk_schedule_status
        CHECK (schedule_status IN ('not_proposed','proposed','approved','rejected'));
    END $$
  `);

  // Extend selection_workflow_state enum with schedule_proposed / schedule_approved.
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.bids DROP CONSTRAINT IF EXISTS chk_workflow_state;
      ALTER TABLE bidding.bids ADD CONSTRAINT chk_workflow_state CHECK (
        selection_workflow_state IN (
          'pending','shortlisted','approved_by_owner','offer_accepted',
          'contract_drafted','contract_owner_signed','contract_contractor_signed',
          'schedule_proposed','schedule_approved',
          'addresses_revealed','in_progress','completion_submitted',
          'completion_acknowledged','payment_received','receipt_issued',
          'paused','rejected','withdrawn','abandoned'
        )
      );
    END $$
  `);

  // One-shot: bring legacy bids (status='accepted' but workflow stayed at 'pending')
  // into 'approved_by_owner' so the new contract / deposit / schedule UI takes over.
  await pool.query(`
    UPDATE bidding.bids
       SET selection_workflow_state = 'approved_by_owner',
           approved_by_owner_at = COALESCE(approved_by_owner_at, NOW()),
           updated_at = NOW()
     WHERE status = 'accepted' AND selection_workflow_state = 'pending'
  `);

  // ── v6.5: Workflow timers + audit log + email outbox ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.workflow_timers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(40) NOT NULL DEFAULT 'bid',
      entity_id UUID NOT NULL,
      timer_type VARCHAR(40) NOT NULL,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      fired_at TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.workflow_timers
        DROP CONSTRAINT IF EXISTS chk_timer_status;
      ALTER TABLE bidding.workflow_timers
        ADD CONSTRAINT chk_timer_status CHECK (status IN ('scheduled','fired','cancelled'));
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timers_due ON bidding.workflow_timers (status, scheduled_for)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.business_holidays (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      holiday_date DATE NOT NULL,
      name VARCHAR(120),
      country_code VARCHAR(8) NOT NULL DEFAULT 'US',
      UNIQUE (holiday_date, country_code)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.workflow_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(40) NOT NULL DEFAULT 'bid',
      entity_id UUID NOT NULL,
      state_from VARCHAR(40),
      state_to VARCHAR(40),
      actor_user_id UUID,
      actor_role VARCHAR(20),
      reason VARCHAR(255),
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON bidding.workflow_audit_log (entity_id, created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.email_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key VARCHAR(80) UNIQUE NOT NULL,
      subject_template TEXT NOT NULL,
      html_template TEXT NOT NULL,
      text_template TEXT,
      version INT DEFAULT 1,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.email_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key VARCHAR(80),
      to_email VARCHAR(320) NOT NULL,
      to_user_id UUID,
      subject TEXT NOT NULL,
      html TEXT NOT NULL,
      text TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      provider_message_id VARCHAR(255),
      queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.email_outbox
        DROP CONSTRAINT IF EXISTS chk_outbox_status;
      ALTER TABLE bidding.email_outbox
        ADD CONSTRAINT chk_outbox_status CHECK (status IN ('queued','sent','failed','dead_lettered'));
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_outbox_due ON bidding.email_outbox (status, queued_at)`);

  // Seed a small set of US holidays so the business-day calculator has data on first run.
  await pool.query(`
    INSERT INTO bidding.business_holidays (holiday_date, name, country_code)
    SELECT * FROM (VALUES
      (DATE '2026-01-01', 'New Year', 'US'),
      (DATE '2026-01-19', 'MLK Day', 'US'),
      (DATE '2026-02-16', 'Presidents Day', 'US'),
      (DATE '2026-05-25', 'Memorial Day', 'US'),
      (DATE '2026-07-03', 'Independence Day observed', 'US'),
      (DATE '2026-09-07', 'Labor Day', 'US'),
      (DATE '2026-11-26', 'Thanksgiving', 'US'),
      (DATE '2026-12-25', 'Christmas Day', 'US')
    ) AS t(holiday_date, name, country_code)
    ON CONFLICT DO NOTHING
  `);

  // ── v6.6: workorder visit tracking + contractor ratings ──

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.workorder_visits (
      bid_id UUID PRIMARY KEY,
      status VARCHAR(40) NOT NULL DEFAULT 'pending_first_check',
      last_check_at TIMESTAMP WITH TIME ZONE,
      reminder_sent_at TIMESTAMP WITH TIME ZONE,
      reminder_count INT NOT NULL DEFAULT 0,
      abandoned_at TIMESTAMP WITH TIME ZONE,
      audit JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.workorder_visits
        DROP CONSTRAINT IF EXISTS chk_workorder_visits_status;
      ALTER TABLE bidding.workorder_visits
        ADD CONSTRAINT chk_workorder_visits_status CHECK (
          status IN ('pending_first_check','reminder_sent','pending_second_check','owner_marked_abandoned','visit_confirmed')
        );
    END $$
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidding.contractor_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bid_id UUID NOT NULL UNIQUE,
      contractor_id UUID NOT NULL,
      owner_id UUID NOT NULL,
      rating SMALLINT,
      review_text TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'requested',
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      rated_at TIMESTAMP WITH TIME ZONE
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE bidding.contractor_ratings
        DROP CONSTRAINT IF EXISTS chk_contractor_ratings_value;
      ALTER TABLE bidding.contractor_ratings
        ADD CONSTRAINT chk_contractor_ratings_value CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
      ALTER TABLE bidding.contractor_ratings
        DROP CONSTRAINT IF EXISTS chk_contractor_ratings_status;
      ALTER TABLE bidding.contractor_ratings
        ADD CONSTRAINT chk_contractor_ratings_status CHECK (status IN ('requested','submitted','declined'));
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contractor_ratings_contractor ON bidding.contractor_ratings (contractor_id, status)`);

  console.log('[migrate:bidding] Bidding domain ready (v6.6: workorder visits + contractor ratings).');
  } catch (error) {
    console.error('[migrate:bidding] Migration failed:', error);
    throw error;
  }
}
