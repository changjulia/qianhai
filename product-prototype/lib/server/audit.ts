import { execute, type Database } from './d1';
import { redactSensitive, stringifyJson } from './json';
import type { RequestActor } from './auth';

export type AuditRisk = 'low' | 'medium' | 'high' | 'critical';
export type AuditResult = 'success' | 'failure' | 'blocked';

export interface AuditEventInput {
  actor?: RequestActor | null;
  actorType?: 'user' | 'agent' | 'system';
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  riskLevel?: AuditRisk;
  result?: AuditResult;
  details?: Record<string, unknown>;
  requestId?: string;
  occurredAt?: string;
}

export async function writeAuditEvent(db: Database, input: AuditEventInput): Promise<string> {
  const id = `audit-${crypto.randomUUID()}`;
  const details = redactSensitive({
    ...(input.details ?? {}),
    ...(input.actor?.organizationId ? { organization_id: input.actor.organizationId } : {}),
    ...(input.requestId ? { request_id: input.requestId } : {}),
  });
  await execute(db, {
    sql: `INSERT INTO security_audit_events
      (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      id,
      input.occurredAt ?? new Date().toISOString(),
      input.actorType ?? input.actor?.actorType ?? 'system',
      input.actorId ?? input.actor?.userId ?? null,
      input.action,
      input.resourceType,
      input.resourceId ?? null,
      input.riskLevel ?? 'low',
      input.result ?? 'success',
      stringifyJson(details),
    ],
  });
  return id;
}

export async function tryWriteAuditEvent(db: Database, input: AuditEventInput): Promise<string | null> {
  try {
    return await writeAuditEvent(db, input);
  } catch (error) {
    console.error('audit_write_failed', error);
    return null;
  }
}
