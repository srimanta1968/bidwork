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

  // ── Locations reference (states · metros · counties · cities · zips) ──
  // Seeded once on first server boot from server/src/data/locations-seed.json.
  // Idempotent re-seed via the unique index below + ON CONFLICT DO NOTHING in the loader.
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects.locations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_code  CHAR(2)      NOT NULL DEFAULT 'US',
      state_code    VARCHAR(8),
      state_name    VARCHAR(120),
      county_name   VARCHAR(120),
      city_name     VARCHAR(120),
      zip_code      VARCHAR(12),
      metro_code    VARCHAR(20),
      metro_name    VARCHAR(180),
      latitude      NUMERIC(9, 6),
      longitude     NUMERIC(9, 6),
      level         VARCHAR(20)  NOT NULL,
      display_label VARCHAR(220) NOT NULL,
      search_text   TEXT         NOT NULL,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.locations
        DROP CONSTRAINT IF EXISTS chk_location_level;
      ALTER TABLE projects.locations
        ADD CONSTRAINT chk_location_level CHECK (level IN ('state','metro','county','city','zip'));
    END $$
  `);
  // Natural key — re-seeding the same JSON is a no-op. metro_code is part of
  // the key so distinct metros that share a state (e.g. all the California
  // CBSAs: SF, San Jose, San Diego, LA, etc.) don't collide into one row.
  await pool.query(`DROP INDEX IF EXISTS projects.idx_locations_natural_key`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_natural_key
      ON projects.locations (
        country_code,
        COALESCE(state_code, ''),
        COALESCE(metro_code, ''),
        COALESCE(county_name, ''),
        COALESCE(city_name, ''),
        COALESCE(zip_code, ''),
        level
      )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_search ON projects.locations USING gin (search_text gin_trgm_ops)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_state_city ON projects.locations (state_code, city_name)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_zip ON projects.locations (zip_code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_metro ON projects.locations (metro_code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_locations_level ON projects.locations (level)`);

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

  // ── v3: Worker type preference and location parsing ──

  // Add worker_type_preference to projects (contractor/skilled_labor/both)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.projects ADD COLUMN worker_type_preference VARCHAR(20) DEFAULT 'both';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.projects DROP CONSTRAINT IF EXISTS chk_worker_type;
      ALTER TABLE projects.projects ADD CONSTRAINT chk_worker_type CHECK (worker_type_preference IN ('contractor', 'skilled_labor', 'both'));
    END $$
  `);

  // Add parsed city and zip_code for efficient job matching
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.projects ADD COLUMN city VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE projects.projects ADD COLUMN zip_code VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  // Backfill city/zip from location_address for existing projects
  await pool.query(`
    UPDATE projects.projects
    SET city = TRIM(SPLIT_PART(location_address, ',', 1)),
        zip_code = SUBSTRING(location_address FROM '(\d{5})')
    WHERE location_address IS NOT NULL AND location_address != ''
      AND (city IS NULL OR city = '')
  `);

  // Index for job matching queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_projects_job_matching
    ON projects.projects (city, zip_code, worker_type_preference)
    WHERE is_listed = true AND status = 'bidding'
  `);

  // ── v4: Per-task material/labor cost breakdown ──
  // Owner can opt out of materials per task ("Owner supplied") which excludes
  // the materials portion from the project's calculated starting bid. The AI
  // scope-gen prompt now returns both splits alongside the combined cost.
  for (const col of [
    'material_cost_min DECIMAL(10, 2)',
    'material_cost_max DECIMAL(10, 2)',
    'labor_cost_min DECIMAL(10, 2)',
    'labor_cost_max DECIMAL(10, 2)',
    'owner_supplied_materials BOOLEAN DEFAULT false',
  ]) {
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE projects.scope_tasks ADD COLUMN ${col};
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);
  }

  // Backfill existing rows with a 60/40 material/labor split so the new columns
  // are non-NULL after migration. Rounded to 2 decimals to match the columns.
  await pool.query(`
    UPDATE projects.scope_tasks
    SET material_cost_min = ROUND(COALESCE(cost_min, 0)::numeric * 0.6, 2),
        material_cost_max = ROUND(COALESCE(cost_max, 0)::numeric * 0.6, 2),
        labor_cost_min    = ROUND(COALESCE(cost_min, 0)::numeric * 0.4, 2),
        labor_cost_max    = ROUND(COALESCE(cost_max, 0)::numeric * 0.4, 2)
    WHERE material_cost_min IS NULL OR labor_cost_min IS NULL
  `);

  console.log('[migrate:projects] Projects domain ready (v4: material/labor split + owner_supplied).');
  } catch (error) {
    console.error('[migrate:projects] Migration failed:', error);
    throw error;
  }
}
