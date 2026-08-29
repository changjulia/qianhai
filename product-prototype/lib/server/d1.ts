import { env } from 'cloudflare:workers';
import { ApiError } from './errors';

export type Database = D1Database;
export type DatabaseRow = Record<string, unknown>;
export interface SqlQuery {
  sql: string;
  params?: readonly unknown[];
}

export function getDatabase(): Database {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) throw new ApiError(503, 'database_unavailable', 'Database binding DB is not configured');
  return db;
}

export function prepare(db: Database, query: SqlQuery): D1PreparedStatement {
  const statement = db.prepare(query.sql);
  return query.params?.length ? statement.bind(...query.params) : statement;
}

export async function queryAll<T extends DatabaseRow = DatabaseRow>(
  db: Database,
  query: SqlQuery,
): Promise<T[]> {
  const result = await prepare(db, query).all<T>();
  return result.results ?? [];
}

export async function queryFirst<T extends DatabaseRow = DatabaseRow>(
  db: Database,
  query: SqlQuery,
): Promise<T | null> {
  return prepare(db, query).first<T>();
}

export async function execute<T extends DatabaseRow = DatabaseRow>(
  db: Database,
  query: SqlQuery,
): Promise<D1Result<T>> {
  return prepare(db, query).run<T>();
}

export async function executeBatch<T extends DatabaseRow = DatabaseRow>(
  db: Database,
  queries: readonly SqlQuery[],
): Promise<D1Result<T>[]> {
  if (queries.length === 0) return [];
  if (queries.length > 100) {
    throw new ApiError(400, 'bad_request', 'A D1 batch may contain at most 100 statements');
  }
  return db.batch<T>(queries.map((query) => prepare(db, query)));
}

/**
 * D1 batch calls are transactional: statements execute in order and the batch is
 * rolled back if any statement fails. Keep each query to one SQL statement.
 */
export const transaction = executeBatch;

export async function databaseHealth(db = getDatabase()): Promise<{ ok: true; latencyMs: number }> {
  const startedAt = Date.now();
  await db.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  return { ok: true, latencyMs: Date.now() - startedAt };
}
