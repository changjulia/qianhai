import { getDatabase, queryAll } from '../../../lib/server/d1';
import { deserializeJsonColumns } from '../../../lib/server/json';

interface CatalogRow extends Record<string, unknown> {
  id: string;
  item_type: string;
  classification: 'open_media' | 'mock';
  geography_scope: string;
  metadata_json: string;
}

const allowedTypes = new Set([
  'enterprise', 'industry', 'product', 'buyer_persona', 'content_brief',
  'campaign', 'video', 'image',
]);
const allowedClassifications = new Set(['open_media', 'mock']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const classification = url.searchParams.get('classification');
  const geography = url.searchParams.get('geography');
  const rawLimit = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 100;

  if (type && !allowedTypes.has(type)) {
    return Response.json({ error: 'invalid_type', allowed: [...allowedTypes] }, { status: 400 });
  }
  if (classification && !allowedClassifications.has(classification)) {
    return Response.json({ error: 'invalid_classification', allowed: [...allowedClassifications] }, { status: 400 });
  }

  const clauses = ["organization_id = 'org-demo-guikesong'"];
  const params: unknown[] = [];
  if (type) { clauses.push('item_type = ?'); params.push(type); }
  if (classification) { clauses.push('classification = ?'); params.push(classification); }
  if (geography) { clauses.push('geography_scope LIKE ?'); params.push(`%${geography}%`); }

  const db = getDatabase();
  const [rows, summaryRows] = await Promise.all([
    queryAll<CatalogRow>(db, {
      sql: `SELECT * FROM tea_industry_catalog WHERE ${clauses.join(' AND ')} ORDER BY classification, item_type, quality_score DESC, id LIMIT ?`,
      params: [...params, limit],
    }),
    queryAll<{ item_type:string; classification:string; count:number }>(db, {
      sql: `SELECT item_type, classification, COUNT(*) AS count FROM tea_industry_catalog WHERE organization_id = 'org-demo-guikesong' GROUP BY item_type, classification ORDER BY classification, item_type`,
    }),
  ]);

  return Response.json({
    scope: '贵州茶产业演示账号',
    disclosure: 'open_media 为开放许可真实媒体；mock 为模拟经营数据。行业参考媒体不等同于贵州实拍或企业自有素材。',
    filters: { type, classification, geography, limit },
    summary: {
      total: summaryRows.reduce((sum, row) => sum + Number(row.count), 0),
      byTypeAndClassification: summaryRows,
    },
    items: rows.map((row) => deserializeJsonColumns(row, ['metadata_json'])),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
