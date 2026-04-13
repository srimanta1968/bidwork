import { Pool } from 'pg';

/**
 * Projects Domain Migration
 * Creates: projects.projects, projects.project_media, projects.scope_tasks, projects.ai_jobs
 * Safe to run on any deployment — only touches projects schema
 */
export async function runProjectMigration(pool: Pool): Promise<void> {
  console.log('[migrate:projects] Running projects domain migrations...');

  try {
  await pool.query('CREATE SCHEMA IF NOT EXISTS projects');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      homeowner_id UUID NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      location_address TEXT,
      location_lat DECIMAL(10, 8),
      location_lng DECIMAL(11, 8),
      urgency VARCHAR(20) DEFAULT 'flexible',
      quality_tier VARCHAR(20) DEFAULT 'standard',
      category VARCHAR(100),
      complexity_tier VARCHAR(20),
      scope_status VARCHAR(30) DEFAULT 'uploading',
      bid_floor DECIMAL(10, 2),
      bid_ceiling DECIMAL(10, 2),
      estimated_days_min INTEGER,
      estimated_days_max INTEGER,
      ai_confidence_score DECIMAL(3, 2),
      assigned_contractor_id UUID,
      is_approved BOOLEAN DEFAULT false,
      is_listed BOOLEAN DEFAULT false,
      status VARCHAR(30) DEFAULT 'draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.project_media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
      s3_key VARCHAR(500) NOT NULL,
      s3_bucket VARCHAR(100) DEFAULT 'bidwork1',
      media_type VARCHAR(20) NOT NULL,
      file_size_bytes INTEGER,
      mime_type VARCHAR(100),
      sort_order INTEGER DEFAULT 0,
      is_representative BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.scope_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
      sort_order INTEGER DEFAULT 0,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      quantity DECIMAL(10, 2),
      unit VARCHAR(50),
      materials JSONB DEFAULT '[]',
      labor_hours_min DECIMAL(6, 2),
      labor_hours_max DECIMAL(6, 2),
      cost_min DECIMAL(10, 2),
      cost_max DECIMAL(10, 2),
      ai_confidence DECIMAL(3, 2),
      photo_evidence_keys TEXT[],
      homeowner_notes TEXT,
      is_homeowner_added BOOLEAN DEFAULT false,
      is_removed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.ai_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
      stage VARCHAR(30) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      attempt_count INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      result JSONB,
      last_error TEXT,
      model_used VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd DECIMAL(8, 6),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Partial index: only scan pending jobs (worker poll performance)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_pending
    ON projects.ai_jobs (scheduled_at ASC)
    WHERE status = 'pending'
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_projects_homeowner
    ON projects.projects (homeowner_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_projects_listed
    ON projects.projects (category, created_at DESC)
    WHERE is_listed = true
  `);

  // ── v2: Photo support & draft resume enhancements ──

  // Add default 'video' to media_type for existing column (idempotent)
  await pool.query(`
    ALTER TABLE projects.project_media
      ALTER COLUMN media_type SET DEFAULT 'video'
  `);

  // Ensure existing records without media_type default to 'video'
  await pool.query(`
    UPDATE projects.project_media
    SET media_type = 'video'
    WHERE media_type IS NULL OR media_type = ''
  `);

  // Add CHECK constraint for valid media types (photo, video)
  // Drop-and-recreate is idempotent
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.project_media
        DROP CONSTRAINT IF EXISTS chk_media_type;
      ALTER TABLE projects.project_media
        ADD CONSTRAINT chk_media_type CHECK (media_type IN ('photo', 'video'));
    END $$
  `);

  // Composite index for filtering media by type within a project
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_project_media_type
    ON projects.project_media (project_id, media_type)
  `);

  // Add owner_start_price to scope_tasks (nullable — null means use AI price)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.scope_tasks ADD COLUMN owner_start_price DECIMAL(10, 2);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  // Create bid_price_rules configuration table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.bid_price_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_category VARCHAR(100),
      min_price_percentage INTEGER NOT NULL DEFAULT 50,
      effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Unique constraint: one rule per job_category (null = global default)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_price_rules_category
    ON projects.bid_price_rules (COALESCE(job_category, '__global__'))
  `);

  // Seed global default rule (50%) if not exists
  await pool.query(`
    INSERT INTO projects.bid_price_rules (job_category, min_price_percentage)
    SELECT NULL, 50
    WHERE NOT EXISTS (
      SELECT 1 FROM projects.bid_price_rules WHERE job_category IS NULL
    )
  `);

  // Add dimensions column to scope_tasks (nullable, freeform text for measurements)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.scope_tasks ADD COLUMN dimensions TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  // Add is_hidden column to scope_tasks (hidden tasks excluded from published scope)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.scope_tasks ADD COLUMN is_hidden BOOLEAN DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  console.log('[migrate:projects] Projects domain ready (v2: photo + pricing + task customization).');
  } catch (error) {
    console.error('[migrate:projects] Migration failed:', error);
    throw error;
  }
}
