import { Pool } from 'pg';

/**
 * Auth Domain Migration
 * Creates: auth.users, auth.contractor_profiles
 * Safe to run on any deployment — only touches auth schema
 */
export async function runAuthMigration(pool: Pool): Promise<void> {
  console.log('[migrate:auth] Running auth domain migrations...');

  try {
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

  // v2: Add serving areas to contractor profiles
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE auth.contractor_profiles ADD COLUMN serving_cities TEXT[] DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE auth.contractor_profiles ADD COLUMN serving_zipcodes TEXT[] DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  // v3: Billing/tax fields used as legal issuer on contractor-issued final
  // payment receipts. The contractor must populate all required fields before
  // the system will issue their receipt; billing_profile_completed_at is set
  // by the API when every required field is non-empty.
  for (const col of [
    "ALTER TABLE auth.contractor_profiles ADD COLUMN legal_company_name VARCHAR(255)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN ein VARCHAR(32)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_address_line1 VARCHAR(255)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_address_line2 VARCHAR(255)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_city VARCHAR(120)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_state VARCHAR(60)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_zip VARCHAR(20)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_phone VARCHAR(40)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN signature_s3_key VARCHAR(500)",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN billing_profile_completed_at TIMESTAMP WITH TIME ZONE",
  ]) {
    await pool.query(`DO $$ BEGIN ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$`);
  }

  // v4: Abandonment flag on contractor profile (used by feat-abandon-flag-credit-transfer)
  for (const col of [
    "ALTER TABLE auth.contractor_profiles ADD COLUMN abandonment_flag_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE auth.contractor_profiles ADD COLUMN last_abandoned_at TIMESTAMP WITH TIME ZONE",
  ]) {
    await pool.query(`DO $$ BEGIN ${col}; EXCEPTION WHEN duplicate_column THEN NULL; END $$`);
  }

  // Backfill legal_company_name from existing business_name where unset
  await pool.query(`
    UPDATE auth.contractor_profiles
    SET legal_company_name = business_name
    WHERE legal_company_name IS NULL AND business_name IS NOT NULL
  `);

  // v5: serving_location_ids — references projects.locations (UUID array). The
  // legacy serving_cities/serving_zipcodes stay populated in parallel during
  // cutover so the existing matching path keeps working until everyone has
  // re-saved their profile through the new picker.
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE auth.contractor_profiles ADD COLUMN serving_location_ids UUID[] NOT NULL DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);

  // Backfill / top-up: for any contractor with serving_cities[], compute the
  // location ids that map to those strings (city match first, metro match for
  // region words like "Bay Area") and UNION them with whatever is already in
  // serving_location_ids. Re-runs are safe — already-matched ids are de-duped
  // by the DISTINCT and the array stays the same when nothing new matches.
  // Runs whenever serving_location_ids has fewer entries than serving_cities,
  // so a partial backfill from an earlier boot gets topped up automatically.
  await pool.query(`
    UPDATE auth.contractor_profiles cp
       SET serving_location_ids = ARRAY(
             SELECT DISTINCT id FROM (
               SELECT unnest(cp.serving_location_ids) AS id
               UNION
               SELECT loc.id
                 FROM unnest(cp.serving_cities) AS sc(name)
                 LEFT JOIN projects.locations loc
                   ON (loc.level = 'city' AND loc.city_name ILIKE sc.name)
                   OR (loc.level = 'metro' AND loc.metro_name ILIKE '%' || sc.name || '%')
                WHERE loc.id IS NOT NULL
             ) ids
           )
     WHERE COALESCE(array_length(cp.serving_cities, 1), 0) > COALESCE(array_length(cp.serving_location_ids, 1), 0)
  `);

  // Seed default admin user for development (password: Admin123!)
  // bcrypt hash of 'Admin123!' with 10 rounds
  await pool.query(`
    INSERT INTO auth.users (email, password_hash, first_name, last_name, role, is_onboarded, is_email_verified)
    SELECT 'admin@bidwork.com', '$2a$10$rqHQxK3T5e5YZWV.dQpCnuN3v7RfVpQWGzHsxkzfU1XqKYGq6Y5aG', 'BidWork', 'Admin', 'admin', true, true
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@bidwork.com')
  `);

  // ── v4: OAuth (Google + LinkedIn) signup/login ──
  // password_hash becomes nullable so OAuth-only users don't need a local password.
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE auth.users ALTER COLUMN password_hash DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth.oauth_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      provider VARCHAR(20) NOT NULL,
      provider_user_id VARCHAR(200) NOT NULL,
      email VARCHAR(320),
      display_name VARCHAR(200),
      profile_json JSONB,
      linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON auth.oauth_accounts (user_id)`);

  console.log('[migrate:auth] Auth domain ready (v4: oauth_accounts + nullable password_hash).');
  } catch (error) {
    console.error('[migrate:auth] Migration failed:', error);
    throw error;
  }
}
