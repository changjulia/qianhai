import { tryWriteAuditEvent } from '../../../../lib/server/audit';
import { execute } from '../../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../../lib/server/errors';
import { createRequestContext } from '../../../../lib/server/request-context';
import {
  getOnboardingState,
  publicOnboardingState,
  requireEnterpriseId,
} from '../_lib';

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const enterpriseId = requireEnterpriseId(context);
    const current = await getOnboardingState(context);
    if (current?.status === 'completed') {
      throw new ApiError(409, 'onboarding_already_completed', 'Completed onboarding cannot be skipped');
    }

    const now = new Date().toISOString();
    if (current) {
      const result = await execute(context.db, {
        sql: `UPDATE organization_onboarding_states
          SET status = 'skipped', version = version + 1, skipped_at = ?, updated_at = ?
          WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?
            AND version = ? AND status <> 'completed'`,
        params: [
          now,
          now,
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          current.version,
        ],
      });
      if (result.meta.changes !== 1) {
        throw new ApiError(409, 'version_conflict', 'Onboarding state was updated elsewhere');
      }
    } else {
      await execute(context.db, {
        sql: `INSERT INTO organization_onboarding_states
          (organization_id, user_id, enterprise_id, status, config_json, version,
           issued_at, skipped_at, created_at, updated_at)
          VALUES (?, ?, ?, 'skipped', '{}', 1, ?, ?, ?, ?)`,
        params: [
          context.actor.organizationId,
          context.actor.userId,
          enterpriseId,
          now,
          now,
          now,
          now,
        ],
      });
    }

    await tryWriteAuditEvent(context.db, {
      actor: context.actor,
      action: 'onboarding.skipped',
      resourceType: 'organization_onboarding',
      resourceId: `${context.actor.organizationId}:${context.actor.userId}`,
      riskLevel: 'low',
      requestId,
      details: { enterprise_id: enterpriseId },
    });
    const saved = await getOnboardingState(context);
    return jsonResponse({
      ok: true,
      onboarding: publicOnboardingState(context, saved),
      requestId,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
