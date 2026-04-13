/**
 * Domain-aware Database Service Factory
 *
 * Each domain (auth, projects, bidding) gets its own connection pool
 * with its own search_path. Today all pools point to the same DB.
 * When scaling, change one env var to split to separate DBs.
 *
 * Usage:
 *   import { authDb, projectDb, biddingDb, workerDb } from './domainDb';
 *   const user = await authDb.queryOne('SELECT * FROM users WHERE id = $1', [id]);
 *   const project = await projectDb.queryOne('SELECT * FROM projects WHERE id = $1', [id]);
 */
import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/env';

interface DomainDbConfig {
  connectionUrl: string;
  schema: string;
  poolMax: number;
  label: string;
}

class DomainDb {
  private pool: Pool;
  private schema: string;
  private label: string;

  constructor(cfg: DomainDbConfig) {
    this.schema = cfg.schema;
    this.label = cfg.label;

    this.pool = new Pool({
      connectionString: cfg.connectionUrl,
      max: cfg.poolMax,
      options: `-c search_path=${cfg.schema},public`,
    });

    this.pool.on('error', (err: Error) => {
      console.error(`[${this.label}] Pool error:`, err.message);
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      console.error(`[${this.label}] Query error:`, { text: text.substring(0, 80), error });
      throw error;
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  async queryAll<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  getSchema(): string {
    return this.schema;
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Build connection URL from env vars.
 * Domain-specific env vars override the default if set.
 */
function buildUrl(envKey: string): string {
  const override = process.env[envKey];
  if (override) return override;
  const { host, port, name, user, password } = config.db;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

// ─── Domain Instances ───
// Today: all point to same DB, different schemas
// Future: change AUTH_DB_URL etc. to point to separate DB servers

export const authDb = new DomainDb({
  connectionUrl: buildUrl('AUTH_DB_URL'),
  schema: 'auth',
  poolMax: 5,
  label: 'authDb',
});

export const projectDb = new DomainDb({
  connectionUrl: buildUrl('PROJECT_DB_URL'),
  schema: 'projects',
  poolMax: 10,
  label: 'projectDb',
});

export const biddingDb = new DomainDb({
  connectionUrl: buildUrl('BIDDING_DB_URL'),
  schema: 'bidding',
  poolMax: 5,
  label: 'biddingDb',
});

export const adminDb = new DomainDb({
  connectionUrl: buildUrl('ADMIN_DB_URL'),
  schema: 'admin',
  poolMax: 5,
  label: 'adminDb',
});

export const catalogDb = new DomainDb({
  connectionUrl: buildUrl('CATALOG_DB_URL'),
  schema: 'catalog',
  poolMax: 5,
  label: 'catalogDb',
});

// Worker gets its own pool so it doesn't starve the API
export const workerDb = new DomainDb({
  connectionUrl: buildUrl('PROJECT_DB_URL'),
  schema: 'projects',
  poolMax: 5,
  label: 'workerDb',
});
