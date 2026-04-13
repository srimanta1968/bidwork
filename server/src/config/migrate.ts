import { Pool } from 'pg';
import { databaseConfig } from './database';
import { runAuthMigration } from './migrations/authMigration';
import { runProjectMigration } from './migrations/projectMigration';
import { runBiddingMigration } from './migrations/biddingMigration';
import { runCatalogMigration } from './migrations/catalogMigration';
import { runAdminMigration } from './migrations/adminMigration';

/**
 * Master migration runner.
 * Runs all domain migrations against the configured database(s).
 * Each domain migration is idempotent and only touches its own schema.
 *
 * When deploying to separate DB servers, each service calls only its own
 * domain migration (e.g., auth service only calls runAuthMigration).
 */
export async function runMigrations(): Promise<void> {
  console.log('[migrate] Starting domain migrations...');

  // For now, all domains share one DB. Create one pool for migrations.
  // In the future, each domain migration gets its own pool URL from env.
  const pool = new Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password,
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await runAuthMigration(pool);
    await runProjectMigration(pool);
    await runBiddingMigration(pool);
    await runCatalogMigration(pool);
    await runAdminMigration(pool);

    // ── Legacy: migrate data from public schema if exists ──
    // Check if old public.users exists and auth.users is empty
    const oldUsers = await pool.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    if (parseInt(oldUsers.rows[0].cnt) > 0) {
      const authCount = await pool.query('SELECT COUNT(*) as cnt FROM auth.users');
      const publicCount = await pool.query('SELECT COUNT(*) as cnt FROM public.users');
      if (parseInt(authCount.rows[0].cnt) === 0 && parseInt(publicCount.rows[0].cnt) > 0) {
        console.log('[migrate] Migrating existing users from public → auth schema...');
        await pool.query(`
          INSERT INTO auth.users (id, email, password_hash, first_name, last_name, phone, role, is_onboarded, is_email_verified, verification_code, verification_code_expires, created_at, updated_at)
          SELECT id, email, password_hash, first_name, last_name, phone, role,
                 COALESCE(is_onboarded, false), COALESCE(is_email_verified, false),
                 verification_code, verification_code_expires, created_at, updated_at
          FROM public.users
          ON CONFLICT (id) DO NOTHING
        `);
        // Migrate contractor profiles if they exist
        const oldProfiles = await pool.query(`
          SELECT COUNT(*) as cnt FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'contractor_profiles'
        `);
        if (parseInt(oldProfiles.rows[0].cnt) > 0) {
          await pool.query(`
            INSERT INTO auth.contractor_profiles (id, user_id, business_name, office_address, phone, license_number, license_type, category, skills, years_experience, bio, is_verified, created_at, updated_at)
            SELECT id, user_id, business_name, office_address, phone, license_number, license_type, category, skills, years_experience, bio, is_verified, created_at, updated_at
            FROM public.contractor_profiles
            ON CONFLICT (user_id) DO NOTHING
          `);
        }
        console.log('[migrate] Legacy data migrated to auth schema.');
      }
    }

    console.log('[migrate] All domain migrations complete.');
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
