import { ApiError } from './errors';
import { execute, queryFirst, type Database, type DatabaseRow } from './d1';
import { parseJsonOr, stringifyJson } from './json';
import { assertCredentialMetadataSafe, assertSecretBindingName } from './security';

export interface DurableTaskState<T = unknown> {
  taskId: string;
  organizationId: string;
  status: string;
  version: number;
  state: T;
  lastActionId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DurableTaskStateRow extends DatabaseRow {
  task_id: string;
  organization_id: string;
  status: string;
  version: number;
  state_json: string;
  last_action_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTaskState<T = unknown>(
  db: Database,
  organizationId: string,
  taskId: string,
): Promise<DurableTaskState<T> | null> {
  const row = await queryFirst<DurableTaskStateRow>(db, {
    sql: `SELECT task_id, organization_id, status, version, state_json, last_action_id,
      updated_by_user_id, created_at, updated_at
      FROM durable_task_states WHERE organization_id = ? AND task_id = ?`,
    params: [organizationId, taskId],
  });
  return row ? mapTaskState<T>(row) : null;
}

export async function saveTaskState<T>(
  db: Database,
  input: {
    organizationId: string;
    taskId: string;
    state: T;
    status?: string;
    lastActionId?: string | null;
    updatedByUserId?: string | null;
    expectedVersion?: number;
  },
): Promise<DurableTaskState<T>> {
  const now = new Date().toISOString();
  const expectedVersion = input.expectedVersion;
  const result = await execute(db, {
    sql: `INSERT INTO durable_task_states
      (task_id, organization_id, state_key, status, version, state_json, last_action_id,
       updated_by_user_id, created_at, updated_at)
      VALUES (?, ?, 'default', ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET
        status = excluded.status,
        version = durable_task_states.version + 1,
        state_json = excluded.state_json,
        last_action_id = excluded.last_action_id,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = excluded.updated_at
      WHERE durable_task_states.organization_id = excluded.organization_id
        AND (? IS NULL OR durable_task_states.version = ?)`,
    params: [
      input.taskId,
      input.organizationId,
      input.status ?? 'active',
      stringifyJson(input.state),
      input.lastActionId ?? null,
      input.updatedByUserId ?? null,
      now,
      now,
      expectedVersion ?? null,
      expectedVersion ?? null,
    ],
  });
  if (result.meta.changes === 0) {
    throw new ApiError(409, 'conflict', 'Task state changed since it was last read');
  }
  const state = await getTaskState<T>(db, input.organizationId, input.taskId);
  if (!state) throw new ApiError(500, 'internal_error', 'Task state could not be reloaded');
  return state;
}

export async function createUiAction(
  db: Database,
  input: {
    organizationId: string;
    userId?: string | null;
    taskId?: string | null;
    actionType: string;
    resourceType: string;
    resourceId?: string | null;
    idempotencyKey?: string | null;
    payload?: unknown;
  },
): Promise<string> {
  const id = `uia-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  try {
    await execute(db, {
      sql: `INSERT INTO ui_actions
        (id, organization_id, user_id, task_id, action_type, resource_type, resource_id,
         idempotency_key, status, payload_json, result_json, occurred_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '{}', ?, ?, ?)`,
      params: [
        id,
        input.organizationId,
        input.userId ?? null,
        input.taskId ?? null,
        input.actionType,
        input.resourceType,
        input.resourceId ?? null,
        input.idempotencyKey ?? null,
        stringifyJson(input.payload ?? {}),
        now,
        now,
        now,
      ],
    });
    return id;
  } catch (error) {
    if (!input.idempotencyKey) throw error;
    const existing = await queryFirst<{ id: string }>(db, {
      sql: 'SELECT id FROM ui_actions WHERE organization_id = ? AND idempotency_key = ?',
      params: [input.organizationId, input.idempotencyKey],
    });
    if (existing) return existing.id;
    throw error;
  }
}

export async function completeUiAction(
  db: Database,
  input: { id: string; status: 'succeeded' | 'failed' | 'cancelled'; result?: unknown; errorCode?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const result = await execute(db, {
    sql: `UPDATE ui_actions SET status = ?, result_json = ?, error_code = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND status IN ('pending','running')`,
    params: [input.status, stringifyJson(input.result ?? {}), input.errorCode ?? null, now, now, input.id],
  });
  if (result.meta.changes === 0) {
    throw new ApiError(409, 'conflict', 'UI action is missing or already completed');
  }
}

export async function saveIntegrationCredentialMetadata(
  db: Database,
  input: {
    id?: string;
    organizationId: string;
    integrationId: string;
    provider: string;
    authScheme: string;
    secretBinding: string;
    secretFingerprint?: string | null;
    status?: 'not_configured' | 'active' | 'expired' | 'revoked' | 'error';
    scopes?: string[];
    metadata?: Record<string, unknown>;
    configuredByUserId?: string | null;
    expiresAt?: string | null;
  },
): Promise<string> {
  assertSecretBindingName(input.secretBinding);
  assertCredentialMetadataSafe(input.metadata ?? {});
  const id = input.id ?? `credmeta-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await execute(db, {
    sql: `INSERT INTO integration_credentials_metadata
      (id, organization_id, integration_id, provider, auth_scheme, secret_binding,
       secret_fingerprint, status, scopes_json, metadata_json, configured_by_user_id,
       configured_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, integration_id, secret_binding) DO UPDATE SET
        provider = excluded.provider,
        auth_scheme = excluded.auth_scheme,
        secret_fingerprint = excluded.secret_fingerprint,
        status = excluded.status,
        scopes_json = excluded.scopes_json,
        metadata_json = excluded.metadata_json,
        configured_by_user_id = excluded.configured_by_user_id,
        configured_at = excluded.configured_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at`,
    params: [
      id,
      input.organizationId,
      input.integrationId,
      input.provider,
      input.authScheme,
      input.secretBinding,
      input.secretFingerprint ?? null,
      input.status ?? 'active',
      stringifyJson(input.scopes ?? []),
      stringifyJson(input.metadata ?? {}),
      input.configuredByUserId ?? null,
      now,
      input.expiresAt ?? null,
      now,
      now,
    ],
  });
  const row = await queryFirst<{ id: string }>(db, {
    sql: `SELECT id FROM integration_credentials_metadata
      WHERE organization_id = ? AND integration_id = ? AND secret_binding = ?`,
    params: [input.organizationId, input.integrationId, input.secretBinding],
  });
  return row?.id ?? id;
}

function mapTaskState<T>(row: DurableTaskStateRow): DurableTaskState<T> {
  return {
    taskId: row.task_id,
    organizationId: row.organization_id,
    status: row.status,
    version: Number(row.version),
    state: parseJsonOr<T>(row.state_json, {} as T),
    ...(row.last_action_id ? { lastActionId: row.last_action_id } : {}),
    ...(row.updated_by_user_id ? { updatedByUserId: row.updated_by_user_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
