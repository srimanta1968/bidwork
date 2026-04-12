import { Pool } from 'pg';
import { databaseConfig } from './database';

/**
 * Auto-migration: runs on every server startup.
 * Each statement is idempotent (IF NOT EXISTS / IF NOT EXISTS column checks).
 * New migrations are appended at the bottom — never edit existing ones.
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password,
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('[migrate] Running auto-migrations...');

    // ── v1: Core users table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        id SERIAL PRIMARY KEY,
        schema_hash VARCHAR(64) NOT NULL,
        version INTEGER DEFAULT 1,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        source VARCHAR(50) DEFAULT 'init'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        password_hash VARCHAR(255),
        role VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── v2: Enhanced user fields + contractor profiles ──
    await addColumnIfNotExists(pool, 'users', 'first_name', 'VARCHAR(100)');
    await addColumnIfNotExists(pool, 'users', 'last_name', 'VARCHAR(100)');
    await addColumnIfNotExists(pool, 'users', 'phone', 'VARCHAR(20)');
    await addColumnIfNotExists(pool, 'users', 'is_onboarded', 'BOOLEAN DEFAULT false');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contractor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        office_address TEXT,
        phone VARCHAR(20),
        license_number VARCHAR(100),
        license_type VARCHAR(100),
        category VARCHAR(100) NOT NULL,
        skills TEXT[],
        years_experience INTEGER,
        bio TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    // ── v3: Email verification ──
    await addColumnIfNotExists(pool, 'users', 'is_email_verified', 'BOOLEAN DEFAULT false');
    await addColumnIfNotExists(pool, 'users', 'verification_code', 'VARCHAR(6)');
    await addColumnIfNotExists(pool, 'users', 'verification_code_expires', 'TIMESTAMP WITH TIME ZONE');

    console.log('[migrate] All migrations applied successfully.');
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Idempotent column addition — skips if column already exists.
 */
async function addColumnIfNotExists(pool: Pool, table: string, column: string, definition: string): Promise<void> {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  if (result.rowCount === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[migrate] Added column ${table}.${column}`);
  }
}
