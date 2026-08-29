import { ApiError } from '../../../lib/server/errors';
import { parseJsonOr } from '../../../lib/server/json';
import type { RequestContext } from '../../../lib/server/request-context';
import { objectValue, optionalString, stringValue } from '../../../lib/server/validation';

export type OnboardingStatus = 'issued' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingConfig {
  company: string;
  industry: string;
  product: string;
  market: string;
  autonomy: string;
}

export type OnboardingConfigPatch = Partial<OnboardingConfig>;

export interface OnboardingStateRow extends Record<string, unknown> {
  organization_id: string;
  user_id: string;
  enterprise_id: string;
  status: OnboardingStatus;
  config_json: string;
  version: number;
  first_growth_task_id: string | null;
  issued_at: string;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  updated_at: string;
}

export function requireEnterpriseId(context: RequestContext): string {
  if (!context.organization.enterpriseId) {
    throw new ApiError(
      409,
      'enterprise_context_required',
      'The active organization must be linked to an enterprise before onboarding can continue',
    );
  }
  return context.organization.enterpriseId;
}

export async function getOnboardingState(
  context: RequestContext,
): Promise<OnboardingStateRow | null> {
  return context.db.prepare(`SELECT organization_id, user_id, enterprise_id, status, config_json,
      version, first_growth_task_id, issued_at, started_at, completed_at, skipped_at, updated_at
    FROM organization_onboarding_states
    WHERE organization_id = ? AND user_id = ? AND enterprise_id = ?`)
    .bind(context.actor.organizationId, context.actor.userId, requireEnterpriseId(context))
    .first<OnboardingStateRow>();
}

export function publicOnboardingState(
  context: RequestContext,
  row: OnboardingStateRow | null,
) {
  return {
    organizationId: context.actor.organizationId,
    enterpriseId: requireEnterpriseId(context),
    userId: context.actor.userId,
    status: row?.status ?? 'not_started',
    config: row ? parseJsonOr<OnboardingConfigPatch>(row.config_json, {}) : {},
    version: row?.version ?? 0,
    firstGrowthTaskId: row?.first_growth_task_id ?? null,
    issuedAt: row?.issued_at ?? null,
    startedAt: row?.started_at ?? null,
    completedAt: row?.completed_at ?? null,
    skippedAt: row?.skipped_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export function parseConfigPatch(value: unknown, requireComplete = false): OnboardingConfigPatch {
  const body = objectValue(value);
  const source = body.config === undefined ? body : objectValue(body.config, 'config');
  const config: OnboardingConfigPatch = {};
  assignString(config, 'company', source.company, 200, requireComplete);
  assignString(config, 'industry', source.industry, 120, requireComplete);
  assignString(config, 'product', source.product, 200, requireComplete);
  assignString(config, 'market', source.market ?? source.targetMarket, 120, requireComplete);
  assignString(config, 'autonomy', source.autonomy, 80, requireComplete);
  if (!requireComplete && Object.keys(config).length === 0) {
    throw new ApiError(422, 'validation_error', 'At least one onboarding config field is required');
  }
  return config;
}

export function requestedVersion(value: unknown): number | undefined {
  const body = objectValue(value);
  if (body.version === undefined || body.version === null) return undefined;
  if (typeof body.version !== 'number' || !Number.isInteger(body.version) || body.version < 0) {
    throw new ApiError(422, 'validation_error', 'version must be a non-negative integer');
  }
  return body.version;
}

export function normalizeAutonomy(value: string): string {
  const aliases: Record<string, string> = {
    '建议模式': 'advisory',
    '审批后执行': 'approval_required',
    '边界内自主': 'bounded_autonomy',
  };
  return aliases[value] ?? value;
}

function assignString(
  target: OnboardingConfigPatch,
  key: keyof OnboardingConfig,
  value: unknown,
  max: number,
  required: boolean,
) {
  if (required) {
    target[key] = stringValue(value, `config.${key}`, { max });
    return;
  }
  const parsed = optionalString(value, `config.${key}`, { max });
  if (parsed !== undefined) target[key] = parsed;
}
