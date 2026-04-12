/**
 * DataService - Central database abstraction layer
 * All database access MUST go through this service
 */
import { Pool, PoolClient, QueryResult } from 'pg';
import { databaseConfig } from '../config/database';

interface DataServiceConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  min: number;
  max: number;
}

/**
 * DataService class - Singleton database abstraction
 * Provides parameterized query execution with connection pooling
 */
class DataService {
  private pool: Pool;

  constructor() {
    const poolConfig: DataServiceConfig = {
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database,
      user: databaseConfig.user,
      password: databaseConfig.password,
      ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
      min: databaseConfig.pool.min,
      max: databaseConfig.pool.max,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Execute a parameterized SQL query
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start: number = Date.now();
    try {
      const result: QueryResult<T> = await this.pool.query<T>(text, params);
      const duration: number = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', { text: text.substring(0, 80), error });
      throw error;
    }
  }

  /**
   * Get a single row from a query
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result: QueryResult<T> = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Get all rows from a query
   */
  async queryAll<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result: QueryResult<T> = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Check database connectivity
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
}

export const dataService: DataService = new DataService();
