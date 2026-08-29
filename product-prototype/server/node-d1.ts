import { DatabaseSync, type StatementSync, type SQLInputValue } from 'node:sqlite';

type Row = Record<string, unknown>;

function normalizeBinding(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`Unsupported SQLite binding type: ${Object.prototype.toString.call(value)}`);
}

function plainRow(value: Row): Row {
  return Object.fromEntries(Object.entries(value));
}

function makeMeta(input: {
  startedAt: number;
  changes?: number;
  lastRowId?: number | bigint;
  rowsRead?: number;
}) {
  const duration = performance.now() - input.startedAt;
  return {
    changed_db: (input.changes ?? 0) > 0,
    changes: input.changes ?? 0,
    duration,
    last_row_id: Number(input.lastRowId ?? 0),
    rows_read: input.rowsRead ?? 0,
    rows_written: input.changes ?? 0,
    size_after: 0,
  };
}

function invoke<T>(statement: StatementSync, method: 'all' | 'get' | 'run', bindings: SQLInputValue[]): T {
  if (bindings.length === 0) return statement[method]() as T;
  return statement[method](...bindings) as T;
}

export class NodeD1PreparedStatement {
  readonly database: NodeD1Database;
  readonly sql: string;
  readonly bindings: SQLInputValue[];

  constructor(database: NodeD1Database, sql: string, bindings: SQLInputValue[] = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...values: unknown[]): NodeD1PreparedStatement {
    return new NodeD1PreparedStatement(this.database, this.sql, values.map(normalizeBinding));
  }

  async all<T extends Row = Row>(): Promise<D1Result<T>> {
    return this.database.executeStatement<T>(this, 'all');
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const statement = this.database.sqlite.prepare(this.sql);
    const row = invoke<Row | undefined>(statement, 'get', this.bindings);
    if (!row) return null;
    const normalized = plainRow(row);
    if (column !== undefined) return (normalized[column] ?? null) as T | null;
    return normalized as T;
  }

  async run<T extends Row = Row>(): Promise<D1Result<T>> {
    return this.database.executeStatement<T>(this, 'run');
  }

  async raw<T extends unknown[] = unknown[]>(): Promise<T[]> {
    const statement = this.database.sqlite.prepare(this.sql);
    const columns = statement.columns().map((column) => column.name);
    const rows = invoke<Row[]>(statement, 'all', this.bindings);
    return rows.map((row) => columns.map((column) => row[column]) as T);
  }
}

export class NodeD1Database {
  readonly sqlite: DatabaseSync;

  constructor(sqlite: DatabaseSync) {
    this.sqlite = sqlite;
  }

  prepare(sql: string): NodeD1PreparedStatement {
    return new NodeD1PreparedStatement(this, sql);
  }

  async batch<T extends Row = Row>(statements: readonly D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const localStatements = statements.map((statement) => {
      if (!(statement instanceof NodeD1PreparedStatement) || statement.database !== this) {
        throw new TypeError('A batch can only contain statements prepared by this database');
      }
      return statement;
    });

    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results: D1Result<T>[] = [];
      for (const statement of localStatements) {
        results.push(this.executeStatementSync<T>(statement, 'auto'));
      }
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      try {
        this.sqlite.exec('ROLLBACK');
      } catch {
        // Preserve the original statement failure.
      }
      throw error;
    }
  }

  async exec(sql: string): Promise<D1ExecResult> {
    const startedAt = performance.now();
    this.sqlite.exec(sql);
    return {
      count: 0,
      duration: performance.now() - startedAt,
    };
  }

  close(): void {
    this.sqlite.close();
  }

  async executeStatement<T extends Row>(
    input: NodeD1PreparedStatement,
    mode: 'all' | 'run' | 'auto',
  ): Promise<D1Result<T>> {
    return this.executeStatementSync<T>(input, mode);
  }

  private executeStatementSync<T extends Row>(
    input: NodeD1PreparedStatement,
    mode: 'all' | 'run' | 'auto',
  ): D1Result<T> {
    const startedAt = performance.now();
    const statement = this.sqlite.prepare(input.sql);
    const returnsRows = mode === 'all' || (mode === 'auto' && statement.columns().length > 0);

    if (returnsRows) {
      const rows = invoke<Row[]>(statement, 'all', input.bindings).map(plainRow) as T[];
      return {
        success: true,
        results: rows,
        meta: makeMeta({ startedAt, rowsRead: rows.length }),
      } as unknown as D1Result<T>;
    }

    const result = invoke<{ changes: number; lastInsertRowid: number | bigint }>(
      statement,
      'run',
      input.bindings,
    );
    return {
      success: true,
      results: [],
      meta: makeMeta({
        startedAt,
        changes: Number(result.changes),
        lastRowId: result.lastInsertRowid,
      }),
    } as unknown as D1Result<T>;
  }
}

export function openNodeD1(databasePath: string): NodeD1Database {
  const sqlite = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return new NodeD1Database(sqlite);
}
