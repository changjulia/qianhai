import { createRequestContext } from '../../../../lib/server/request-context';
import { execute, queryFirst } from '../../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../../lib/server/errors';
import { publicOnboardingState, requireEnterpriseId, type OnboardingStateRow } from '../_lib';

interface AccountOnboardingRow extends Record<string, unknown> {
  onboarding_task_issued_at: string | null;
}

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const { actor, db } = context;
    const enterpriseId = requireEnterpriseId(context);
    const issuedAt = new Date().toISOString();

    const claim = await execute(db, {
      sql: `UPDATE app_users
        SET onboarding_task_issued_at = ?, updated_at = ?
        WHERE id = ? AND onboarding_task_issued_at IS NULL`,
      params: [issuedAt, issuedAt, actor.userId],
    });
    const shouldStartOnboarding = claim.meta.changes === 1;

    if (shouldStartOnboarding) {
      await execute(db, {
        sql: `INSERT OR IGNORE INTO organization_onboarding_states
          (organization_id, user_id, enterprise_id, status, config_json, version,
           issued_at, created_at, updated_at)
          VALUES (?, ?, ?, 'issued', '{}', 1, ?, ?, ?)`,
        params: [actor.organizationId, actor.userId, enterpriseId, issuedAt, issuedAt, issuedAt],
      });
    }

    const accountState = shouldStartOnboarding
      ? { onboarding_task_issued_at: issuedAt }
      : await queryFirst<AccountOnboardingRow>(db, {
          sql: 'SELECT onboarding_task_issued_at FROM app_users WHERE id = ?',
          params: [actor.userId],
        });

    if (!accountState?.onboarding_task_issued_at) {
      throw new ApiError(500, 'onboarding_state_unavailable', 'Unable to persist onboarding state');
    }

    const onboardingState = await queryFirst<OnboardingStateRow>(db, {
      sql: `SELECT organization_id, user_id, enterprise_id, status, config_json, version,
          first_growth_task_id, issued_at, started_at, completed_at, skipped_at, updated_at
        FROM organization_onboarding_states
        WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?`,
      params: [actor.organizationId, actor.userId, enterpriseId],
    });
    if (shouldStartOnboarding && onboardingState?.status !== 'issued') {
      throw new ApiError(500, 'onboarding_state_unavailable', 'Unable to initialize onboarding state');
    }

    return jsonResponse({
      ok: true,
      shouldStartOnboarding,
      issuedAt: accountState.onboarding_task_issued_at,
      onboarding: publicOnboardingState(context, onboardingState),
      requestId,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
