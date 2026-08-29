import { getDatabase, queryAll } from '../lib/server/d1';
import { deserializeJsonColumns } from '../lib/server/json';
import { JSON_COLUMNS, type DemoDatasetSummary, type DemoTable } from './schema';

type D1ResultRow = Record<string, unknown>;

export async function listRows(table: DemoTable, limit = 100): Promise<D1ResultRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const rows = await queryAll<D1ResultRow>(getDatabase(), {
    sql: `SELECT * FROM ${table} LIMIT ?`,
    params: [safeLimit],
  });
  const jsonColumns = table in JSON_COLUMNS
    ? JSON_COLUMNS[table as keyof typeof JSON_COLUMNS]
    : [];
  return rows.map((row) => deserializeJsonColumns(row, jsonColumns));
}

export async function getDemoDatasetSummary(): Promise<DemoDatasetSummary> {
  const db = getDatabase();
  const countTables: DemoTable[] = [
    'industry_facts', 'assets', 'inspirations', 'contents', 'content_schedule',
    'ad_campaigns', 'customers', 'opportunities', 'orders', 'approvals',
  ];
  const [manifest, pipeline, revenue, ...countResults] = await db.batch([
    db.prepare('SELECT * FROM dataset_manifest WHERE id = ?').bind('dataset-demo-20260829'),
    db.prepare('SELECT COALESCE(SUM(amount_cny), 0) AS value FROM opportunities'),
    db.prepare('SELECT COALESCE(SUM(amount_cny), 0) AS value FROM orders'),
    ...countTables.map((table) => db.prepare(`SELECT COUNT(*) AS value FROM ${table}`)),
  ]);

  const counts = Object.fromEntries(
    countTables.map((table, index) => [
      table,
      Number((countResults[index].results?.[0] as D1ResultRow | undefined)?.value ?? 0),
    ]),
  );

  return {
    dataset: (manifest.results?.[0] as D1ResultRow | undefined) ?? null,
    counts,
    pipelineCny: Number((pipeline.results?.[0] as D1ResultRow | undefined)?.value ?? 0),
    demoRevenueCny: Number((revenue.results?.[0] as D1ResultRow | undefined)?.value ?? 0),
  };
}
