import { Pool } from 'pg';

/**
 * Bidding Domain Migration
 * Creates: bidding.bids
 * Safe to run on any deployment — only touches bidding schema
 */
export async function runBiddingMigration(pool: Pool): Promise<void> {
  console.log('[migrate:bidding] Running bidding domain migrations...');

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

  console.log('[migrate:bidding] Bidding domain ready (v3: Q&A + materials).');
}
