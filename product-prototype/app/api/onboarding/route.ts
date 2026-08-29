import { tryWriteAuditEvent } from '../../../lib/server/audit';
import { execute } from '../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../lib/server/errors';
import { stringifyJson } from '../../../lib/server/json';
import { createRequestContext } from '../../../lib/server/request-context';
import { readJsonBody } from '../../../lib/server/validation';
import {
  getOnboardingState,
  parseConfigPatch,
  publicOnboardingState,
  requestedVersion,
  requireEnterpriseId,
} from './_lib';

export async function GET(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const state = await getOnboardingState(context);
    return jsonResponse({
      ok: true,
      onboarding: publicOnboardingState(context, state),
      requestId,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}

export async function PUT(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const enterpriseId = requireEnterpriseId(context);
    const body = await readJsonBody(request, { maxBytes: 32_000 });
    const patch = parseConfigPatch(body);
    const expectedVersion = requestedVersion(body);
    const current = await getOnboardingState(context);

    if (current?.status === 'completed') {
      throw new ApiError(409, 'onboarding_already_completed', 'Completed onboarding cannot be edited');
    }
    if (expectedVersion !== undefined && expectedVersion !== (current?.version ?? 0)) {
      throw new ApiError(409, 'version_conflict', 'Onboarding config was updated elsewhere', {
        currentVersion: current?.version ?? 0,
      });
    }

    const now = new Date().toISOString();
    const config = { ...(current ? JSON.parse(current.config_json) as Record<string, unknown> : {}), ...patch };
    if (current) {
      const result = await execute(context.db, {
        sql: `UPDATE organization_onboarding_states
          SET status = 'in_progress', config_json = ?, version = version + 1,
              started_at = COALESCE(started_at, ?), skipped_at = NULL, updated_at = ?
          WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?
            AND version = ? AND status <> 'completed'`,
        params: [
          stringifyJson(config),
          now,
          now,
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          current.version,
        ],
      });
      if (result.meta.changes !== 1) {
        throw new ApiError(409, 'version_conflict', 'Onboarding config was updated elsewhere');
      }
    } else {
      const result = await execute(context.db, {
        sql: `INSERT OR IGNORE INTO organization_onboarding_states
          (organization_id, user_id, enterprise_id, status, config_json, version,
           issued_at, started_at, created_at, updated_at)
          VALUES (?, ?, ?, 'in_progress', ?, 1, ?, ?, ?, ?)`,
        params: [
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          stringifyJson(config),
          now,
          now,
          now,
          now,
        ],
      });
      if (result.meta.changes !== 1) {
        throw new ApiError(409, 'version_conflict', 'Onboarding config was created concurrently');
      }
    }

    await tryWriteAuditEvent(context.db, {
      actor: context.actor,
      action: 'onboarding.config_saved',
      resourceType: 'organization_onboarding',
      resourceId: `${context.actor.organizationId}:${context.actor.userId}`,
      riskLevel: 'low',
      requestId,
      details: { enterprise_id: enterpriseId, fields: Object.keys(patch) },
    });
    const saved = await getOnboardingState(context);
    return jsonResponse({
      ok: true,
      onboarding: publicOnboardingState(context, saved),
      requestId,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
