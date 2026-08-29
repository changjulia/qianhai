import { ApiError } from './errors';
import type { Database } from './d1';
import type { RequestActor } from './auth';
import { objectValue, optionalString, stringValue } from './validation';

export const WORKFLOW_ACTIONS = [
  'create_task', 'update_task', 'create_content', 'schedule_content', 'create_campaign',
  'create_customer', 'create_inquiry', 'create_quote', 'request_quote_approval',
  'decide_approval', 'create_order', 'record_attribution', 'get_run', 'cleanup_run',
] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export interface WorkflowInput {
  action: WorkflowAction;
  runId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export function parseWorkflowInput(value: unknown, request: Request): WorkflowInput {
  const body = objectValue(value);
  const action = stringValue(body.action, 'action', { max: 80 });
  if (!WORKFLOW_ACTIONS.includes(action as WorkflowAction)) {
    throw new ApiError(422, 'validation_error', `Unsupported workflow action: ${action}`);
  }
  const runId = stringValue(body.runId, 'runId', { max: 120 });
  const headerKey = request.headers.get('idempotency-key')?.trim();
  const bodyKey = optionalString(body.idempotencyKey, 'idempotencyKey', { max: 200 });
  const idempotencyKey = headerKey || bodyKey || `${runId}:${action}`;
  return { action: action as WorkflowAction, runId, idempotencyKey, payload: objectValue(body.payload ?? {}, 'payload') };
}

export function workflowId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export async function assertTaskScope(db: Database, organizationId: string, taskId: string) {
  const row = await db.prepare(`SELECT g.id FROM growth_tasks g
    JOIN durable_task_states d ON d.task_id=g.id
    WHERE g.id=? AND d.organization_id=?`).bind(taskId, organizationId).first();
  if (!row) throw new ApiError(404, 'not_found', 'Task was not found in this organization');
}

export async function priorResult(db: Database, organizationId: string, key: string) {
  const row = await db.prepare(`SELECT response_json FROM idempotency_keys
    WHERE organization_id=? AND idempotency_key=? AND status='succeeded'`)
    .bind(organizationId, key).first<{ response_json: string }>();
  if (!row) return null;
  try { return JSON.parse(row.response_json) as Record<string, unknown>; } catch { return null; }
}

export function commonStatements(input: {
  db: Database; actor: RequestActor; ledgerId: string; auditId: string; historyId?: string;
  outboxId: string; workflow: WorkflowInput; resourceType: string; resourceId: string;
  result: Record<string, unknown>; fromState?: string | null; toState?: string | null;
  taskId?: string | null; customerId?: string | null; opportunityId?: string | null;
}) {
  const { db, actor, ledgerId, auditId, outboxId, workflow, resourceType, resourceId, result } = input;
  const now = new Date().toISOString();
  return [
    db.prepare(`INSERT INTO idempotency_keys
      (id,organization_id,workflow_run_id,action_type,idempotency_key,request_hash,status,resource_type,resource_id,response_json,completed_at)
      VALUES (?,?,?,?,?,?,'succeeded',?,?,?,?)`)
      .bind(ledgerId, actor.organizationId, workflow.runId, workflow.action, workflow.idempotencyKey,
        workflow.idempotencyKey, resourceType, resourceId, json(result), now),
    ...(input.historyId ? [db.prepare(`INSERT INTO business_state_history
      (id,organization_id,workflow_run_id,task_id,customer_id,opportunity_id,entity_type,entity_id,
       from_state,to_state,event_type,actor_type,actor_id,correlation_id,idempotency_key,before_json,after_json,occurred_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(input.historyId, actor.organizationId, workflow.runId, input.taskId ?? null,
        input.customerId ?? null, input.opportunityId ?? null, resourceType, resourceId,
        input.fromState ?? null, input.toState ?? 'created', `workflow.${workflow.action}`,
        'user', actor.userId, workflow.runId, `${workflow.idempotencyKey}:history`,
        json({ status: input.fromState ?? null }), json(result), now)] : []),
    db.prepare(`INSERT INTO business_outbox
      (id,organization_id,aggregate_type,aggregate_id,event_type,payload_json,correlation_id,idempotency_key,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,'pending',?,?)`)
      .bind(outboxId, actor.organizationId, resourceType, resourceId, `workflow.${workflow.action}`,
        json(result), workflow.runId, `${workflow.idempotencyKey}:outbox`, now, now),
    db.prepare(`INSERT INTO security_audit_events
      (id,occurred_at,actor_type,actor_id,action,resource_type,resource_id,risk_level,result,details_json)
      VALUES (?,?,'user',?,?,?,?,?,'success',?)`)
      .bind(auditId, now, actor.userId, `workflow.${workflow.action}`, resourceType, resourceId,
        workflow.action.includes('approval') || workflow.action.includes('order') ? 'high' : 'medium',
        json({ organization_id: actor.organizationId, run_id: workflow.runId, idempotency_key: workflow.idempotencyKey })),
  ];
}

export function requireTransition(current: string, next: string, map: Record<string, readonly string[]>) {
  if (!(map[current] ?? []).includes(next)) {
    throw new ApiError(409, 'conflict', `Illegal state transition: ${current} -> ${next}`,
      { current, next, allowed: map[current] ?? [] });
  }
}
