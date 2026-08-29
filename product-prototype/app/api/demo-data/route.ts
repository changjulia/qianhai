import { getDemoDatasetSummary, listRows } from '../../../db';
import { DEMO_TABLES, type DemoTable } from '../../../db/schema';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection');
  const limit = Number(url.searchParams.get('limit') ?? '100');

  if (!collection) {
    return Response.json(await getDemoDatasetSummary(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (!DEMO_TABLES.includes(collection as DemoTable)) {
    return Response.json(
      { error: 'unknown_collection', allowedCollections: DEMO_TABLES },
      { status: 400 },
    );
  }

  const rows = await listRows(collection as DemoTable, Number.isFinite(limit) ? limit : 100);
  return Response.json(
    { collection, classificationNotice: '公开事实与Demo模拟数据已分层标记。', rows },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

