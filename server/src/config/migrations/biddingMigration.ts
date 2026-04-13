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

  console.log('[migrate:bidding] Bidding domain ready.');
}
