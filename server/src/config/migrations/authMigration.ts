import { Pool } from 'pg';

/**
 * Auth Domain Migration
 * Creates: auth.users, auth.contractor_profiles
 * Safe to run on any deployment — only touches auth schema
 */
export async function runAuthMigration(pool: Pool): Promise<void> {
  console.log('[migrate:auth] Running auth domain migrations...');

  await pool.query('CREATE SCHEMA IF NOT EXISTS auth');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      role VARCHAR(50) NOT NULL DEFAULT 'homeowner',
      is_onboarded BOOLEAN DEFAULT false,
      is_email_verified BOOLEAN DEFAULT false,
      verification_code VARCHAR(6),
      verification_code_expires TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth.contractor_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email)
  `);

  console.log('[migrate:auth] Auth domain ready.');
}
