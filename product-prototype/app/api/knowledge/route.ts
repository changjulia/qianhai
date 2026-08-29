import { env } from 'cloudflare:workers';

const enterpriseId = 'ent-demo-matcha';

function actor(request: Request) {
  return request.headers.get('oai-authenticated-user-id') || request.headers.get('oai-authenticated-user-email') || 'local-development-user';
}

async function audit(request: Request, action: string, details: Record<string, unknown>) {
  const db = (env as unknown as {DB:D1Database}).DB;
  await db.prepare(`INSERT INTO security_audit_events
    (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
    VALUES (?, ?, 'user', ?, ?, 'enterprise_knowledge', ?, 'medium', 'success', ?)`)
    .bind(crypto.randomUUID(), new Date().toISOString(), actor(request), action, enterpriseId, JSON.stringify(details)).run();
}

export async function GET() {
  const db = (env as unknown as {DB:D1Database}).DB;
  const row = await db.prepare('SELECT state_json, version, updated_by, updated_at FROM enterprise_knowledge_state WHERE enterprise_id = ?')
    .bind(enterpriseId).first<{state_json:string;version:number;updated_by:string;updated_at:string}>();
  return Response.json(row ? { state: JSON.parse(row.state_json), version: row.version, updatedBy: row.updated_by, updatedAt: row.updated_at } : { state: null, version: 0 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const db = (env as unknown as {DB:D1Database}).DB;
  const body = await request.json().catch(() => null) as { state?:unknown; version?:number } | null;
  if (!body?.state || typeof body.state !== 'object') return Response.json({ error: 'invalid_knowledge_state' }, { status: 400 });
  const encoded = JSON.stringify(body.state);
  if (encoded.length > 250_000) return Response.json({ error: 'knowledge_state_too_large' }, { status: 413 });
  const current = await db.prepare('SELECT version FROM enterprise_knowledge_state WHERE enterprise_id = ?').bind(enterpriseId).first<{version:number}>();
  if (current && typeof body.version === 'number' && body.version !== current.version) return Response.json({ error: 'version_conflict', currentVersion: current.version }, { status: 409 });
  const nextVersion = (current?.version ?? 0) + 1;
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO enterprise_knowledge_state (enterprise_id, state_json, version, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(enterprise_id) DO UPDATE SET state_json=excluded.state_json, version=excluded.version, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .bind(enterpriseId, encoded, nextVersion, actor(request), now).run();
  await audit(request, 'knowledge.update', { version: nextVersion });
  return Response.json({ ok: true, version: nextVersion, updatedAt: now });
}
