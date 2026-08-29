import { tryWriteAuditEvent } from '../../../../lib/server/audit';
import { execute } from '../../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../../lib/server/errors';
import { stringifyJson } from '../../../../lib/server/json';
import { createRequestContext } from '../../../../lib/server/request-context';
import { readJsonBody } from '../../../../lib/server/validation';
import {
  getOnboardingState,
  normalizeAutonomy,
  parseConfigPatch,
  publicOnboardingState,
  requestedVersion,
  requireEnterpriseId,
  type OnboardingConfig,
} from '../_lib';

interface GrowthTaskRow extends Record<string, unknown> {
  id: string;
  enterprise_id: string;
  name: string;
  target_market: string;
  autonomy_mode: string;
  status: string;
  starts_on: string;
  ends_on: string;
}

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const enterpriseId = requireEnterpriseId(context);
    const body = await readJsonBody(request, { maxBytes: 32_000 });
    const config = parseConfigPatch(body, true) as OnboardingConfig;
    const expectedVersion = requestedVersion(body);
    let current = await getOnboardingState(context);

    if (current?.status === 'completed') {
      const existingTask = await getFirstTask(context.db, context.actor.organizationId, current.first_growth_task_id);
      if (!existingTask) {
        throw new ApiError(500, 'onboarding_task_unavailable', 'Completed onboarding is missing its first growth task');
      }
      return jsonResponse({
        ok: true,
        replayed: true,
        onboarding: publicOnboardingState(context, current),
        task: publicTask(existingTask),
        requestId,
      });
    }
    if (expectedVersion !== undefined && expectedVersion !== (current?.version ?? 0)) {
      throw new ApiError(409, 'version_conflict', 'Onboarding config was updated elsewhere', {
        currentVersion: current?.version ?? 0,
      });
    }

    const now = new Date().toISOString();
    if (!current) {
      await execute(context.db, {
        sql: `INSERT OR IGNORE INTO organization_onboarding_states
          (organization_id, user_id, enterprise_id, status, config_json, version,
           issued_at, created_at, updated_at)
          VALUES (?, ?, ?, 'issued', '{}', 1, ?, ?, ?)`,
        params: [
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          now,
          now,
          now,
        ],
      });
      current = await getOnboardingState(context);
    }
    if (!current) {
      throw new ApiError(500, 'onboarding_state_unavailable', 'Unable to initialize onboarding state');
    }

    const taskId = await stableFirstTaskId(context.actor.organizationId, context.actor.userId);
    const idempotencyKey = `onboarding:first-task:${context.actor.organizationId}:${context.actor.userId}`;
    const product = await context.db.prepare(
      'SELECT id FROM products WHERE enterprise_id = ? AND name = ? LIMIT 1',
    ).bind(enterpriseId, config.product).first<{ id: string }>();
    const startsOn = now.slice(0, 10);
    const endsOnDate = new Date(now);
    endsOnDate.setUTCDate(endsOnDate.getUTCDate() + 30);
    const endsOn = endsOnDate.toISOString().slice(0, 10);
    const taskName = `${config.product} · ${config.market}市场获客任务`;
    const taskState = stringifyJson({
      source: 'onboarding',
      onboarding_status: 'completed',
      product_name: config.product,
      target_market: config.market,
    });

    await context.db.batch([
      context.db.prepare(`INSERT OR IGNORE INTO growth_tasks
        (id, enterprise_id, name, product_ids_json, target_market, target_segments_json,
         languages_json, channels_json, autonomy_mode, starts_on, ends_on, budget_cny,
         goals_json, status, owner_role, workflow_run_id, idempotency_key)
        SELECT ?, ?, ?, ?, ?, '[]', '["zh-CN"]', '[]', ?, ?, ?, 0, ?, 'draft',
          '项目负责人', NULL, ?
        FROM organization_onboarding_states
        WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?
          AND version = ? AND status <> 'completed'`)
        .bind(
          taskId,
          enterpriseId,
          taskName,
          stringifyJson(product ? [product.id] : []),
          config.market,
          normalizeAutonomy(config.autonomy),
          startsOn,
          endsOn,
          stringifyJson({
            source: 'onboarding',
            company: config.company,
            industry: config.industry,
            product: config.product,
            objective: 'lead_generation',
          }),
          idempotencyKey,
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          current.version,
        ),
      context.db.prepare(`INSERT OR IGNORE INTO durable_task_states
        (task_id, organization_id, state_key, status, version, state_json,
         updated_by_user_id, created_at, updated_at)
        SELECT id, ?, 'default', 'active', 1, ?, ?, ?, ?
        FROM growth_tasks WHERE id = ? AND enterprise_id = ?`)
        .bind(
          context.actor.organizationId,
          taskState,
          context.actor.userId,
          now,
          now,
          taskId,
          enterpriseId,
        ),
      context.db.prepare(`UPDATE organization_onboarding_states
        SET status = 'completed', config_json = ?, version = version + 1,
            first_growth_task_id = ?, started_at = COALESCE(started_at, ?),
            completed_at = ?, skipped_at = NULL, updated_at = ?
        WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?
          AND version = ? AND status <> 'completed'`)
        .bind(
          stringifyJson(config),
          taskId,
          now,
          now,
          now,
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          current.version,
        ),
      context.db.prepare(`UPDATE app_users
        SET onboarding_task_issued_at = COALESCE(onboarding_task_issued_at, ?), updated_at = ?
        WHERE id = ?`).bind(now, now, context.actor.userId),
    ]);

    const saved = await getOnboardingState(context);
    const task = await getFirstTask(context.db, context.actor.organizationId, taskId);
    if (saved?.status !== 'completed' || saved.first_growth_task_id !== taskId || !task) {
      throw new ApiError(409, 'onboarding_completion_conflict', 'Onboarding was updated concurrently');
    }

    await tryWriteAuditEvent(context.db, {
      actor: context.actor,
      action: 'onboarding.completed',
      resourceType: 'growth_task',
      resourceId: taskId,
      riskLevel: 'medium',
      requestId,
      details: { enterprise_id: enterpriseId, first_growth_task_id: taskId },
    });
    return jsonResponse({
      ok: true,
      replayed: false,
      onboarding: publicOnboardingState(context, saved),
      task: publicTask(task),
      requestId,
    }, { status: 201 });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}

async function getFirstTask(db: D1Database, organizationId: string, taskId: string | null) {
  if (!taskId) return null;
  return db.prepare(`SELECT g.id, g.enterprise_id, g.name, g.target_market, g.autonomy_mode,
      g.status, g.starts_on, g.ends_on
    FROM growth_tasks g
    JOIN durable_task_states d ON d.task_id = g.id
    WHERE g.id = ? AND d.organization_id = ?`)
    .bind(taskId, organizationId)
    .first<GrowthTaskRow>();
}

function publicTask(task: GrowthTaskRow) {
  return {
    id: task.id,
    enterpriseId: task.enterprise_id,
    name: task.name,
    targetMarket: task.target_market,
    autonomyMode: task.autonomy_mode,
    status: task.status,
    startsOn: task.starts_on,
    endsOn: task.ends_on,
  };
}

async function stableFirstTaskId(organizationId: string, userId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`onboarding-first-task:${organizationId}:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `task-onboarding-${hash}`;
}
