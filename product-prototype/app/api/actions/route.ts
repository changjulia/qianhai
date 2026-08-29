import { env } from 'cloudflare:workers';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { action?:string; description?:string; resourceType?:string; resourceId?:string } | null;
  if (!body?.action || typeof body.action !== 'string' || body.action.length > 120) return Response.json({ error: 'invalid_action' }, { status: 400 });
  const actor = request.headers.get('oai-authenticated-user-id') || request.headers.get('oai-authenticated-user-email') || 'local-development-user';
  const id = crypto.randomUUID();
  await ((env as unknown as {DB:D1Database}).DB).prepare(`INSERT INTO security_audit_events
    (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
    VALUES (?, ?, 'user', ?, ?, ?, ?, 'low', 'recorded', ?)`)
    .bind(id, new Date().toISOString(), actor, body.action, body.resourceType || 'ui_action', body.resourceId || null, JSON.stringify({ description: body.description || '' })).run();
  return Response.json({ ok: true, auditId: id });
}
