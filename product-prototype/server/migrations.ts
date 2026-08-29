import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { NodeD1Database } from './node-d1';

interface MigrationRecord {
  name: string;
}

export function resolveDatabasePath(value: string | undefined): string {
  if (!value) return resolve(process.cwd(), 'data', 'qianhai.sqlite');
  if (value === ':memory:') return value;
  return resolve(process.cwd(), value);
}

export function prepareDatabaseDirectory(databasePath: string): void {
  if (databasePath === ':memory:') return;
  mkdirSync(dirname(databasePath), { recursive: true });
}

export function applyMigrations(database: NodeD1Database, migrationsPath: string): string[] {
  const directory = resolve(process.cwd(), migrationsPath);
  const migrationFiles = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+_[\w.-]+\.sql$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));

  database.sqlite.exec(`CREATE TABLE IF NOT EXISTS _node_schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(
    database.sqlite
      .prepare('SELECT name FROM _node_schema_migrations ORDER BY name')
      .all()
      .map((row) => (row as unknown as MigrationRecord).name),
  );
  const newlyApplied: string[] = [];

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;
    const sql = readFileSync(resolve(directory, filename), 'utf8');
    database.sqlite.exec('BEGIN IMMEDIATE');
    try {
      database.sqlite.exec(sql);
      database.sqlite
        .prepare('INSERT INTO _node_schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(filename, new Date().toISOString());
      database.sqlite.exec('COMMIT');
      newlyApplied.push(filename);
    } catch (error) {
      try {
        database.sqlite.exec('ROLLBACK');
      } catch {
        // Preserve the migration error.
      }
      throw new Error(`Failed to apply migration ${filename}`, { cause: error });
    }
  }

  return newlyApplied;
}

