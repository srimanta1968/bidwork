import { Pool } from 'pg';

/**
 * Catalog Domain Migration
 * Creates: catalog.contractor_catalogs, catalog.catalog_items
 * Contractor product catalogs with materials, brands, and specifications.
 */
export async function runCatalogMigration(pool: Pool): Promise<void> {
  console.log('[migrate:catalog] Running catalog domain migrations...');

  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS catalog');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalog.contractor_catalogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL,
        job_category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalog.catalog_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_id UUID NOT NULL REFERENCES catalog.contractor_catalogs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        model VARCHAR(255),
        specifications TEXT,
        image_url VARCHAR(500),
        unit_price DECIMAL(10, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // One catalog per contractor per job category
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_contractor_category
      ON catalog.contractor_catalogs (contractor_id, job_category)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_catalog_items_catalog
      ON catalog.catalog_items (catalog_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_catalogs_contractor
      ON catalog.contractor_catalogs (contractor_id)
    `);

    console.log('[migrate:catalog] Catalog domain ready.');
  } catch (error) {
    console.error('[migrate:catalog] Migration failed:', error);
    throw error;
  }
}
