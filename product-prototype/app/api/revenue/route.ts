import { env } from 'cloudflare:workers';

type Row = Record<string, unknown>;

export async function GET() {
  const db = (env as unknown as {DB:D1Database}).DB;
  const [orders, events, pipeline] = await db.batch([
    db.prepare(`SELECT o.id, o.customer_id AS customerId, c.display_name AS customer, c.market,
      c.source_channel AS channel, o.amount_cny AS amount, o.contribution_type AS type,
      o.evidence_completeness AS completeness,
      '内容触达 → 客户询盘 → 数字员工跟进 → 人工确认 → 订单' AS path
      FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.ordered_at DESC`),
    db.prepare(`SELECT ae.id, ae.customer_id AS customerId, ae.opportunity_id AS opportunityId, ae.occurred_at AS occurredAt,
      ae.event_type AS eventType, ae.source_type AS sourceType, ae.source_id AS sourceId, ae.metadata_json AS metadata
      FROM attribution_events ae ORDER BY ae.occurred_at ASC`),
    db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_cny), 0) AS amount FROM opportunities WHERE stage NOT IN ('won','lost')`),
  ]);
  return Response.json({
    orders: (orders.results as Row[]).map(row => ({ ...row, amount: Number(row.amount), completeness: Number(row.completeness) })),
    events: (events.results as Row[]).map(row => ({ ...row, metadata: JSON.parse(String(row.metadata || '{}')) })),
    pipeline: { count: Number((pipeline.results[0] as Row | undefined)?.count ?? 0), amount: Number((pipeline.results[0] as Row | undefined)?.amount ?? 0) },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const db = (env as unknown as {DB:D1Database}).DB;
  const body = await request.json().catch(() => null) as { action?:string; filters?:Record<string,unknown>; model?:string } | null;
  if (body?.action !== 'export') return Response.json({ error: 'unsupported_action' }, { status: 400 });
  const requestedBy = request.headers.get('oai-authenticated-user-id') || request.headers.get('oai-authenticated-user-email') || 'local-development-user';
  const id = `report-${crypto.randomUUID()}`;
  await db.batch([
    db.prepare('INSERT INTO report_exports (id, report_type, filters_json, requested_by, status) VALUES (?, ?, ?, ?, ?)')
      .bind(id, 'revenue_attribution', JSON.stringify({ ...body.filters, model: body.model }), requestedBy, 'ready'),
    db.prepare(`INSERT INTO security_audit_events
      (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
      VALUES (?, ?, 'user', ?, 'revenue.export', 'report', ?, 'low', 'success', ?)`)
      .bind(crypto.randomUUID(), new Date().toISOString(), requestedBy, id, JSON.stringify({ model: body.model })),
  ]);
  return Response.json({ ok: true, reportId: id, status: 'ready' });
}
