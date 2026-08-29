import { env } from 'cloudflare:workers';
import { ApiError } from './errors';
import { executeBatch, queryFirst, type Database } from './d1';
import { stringifyJson } from './json';
import { readSessionClaims, stableEntityId } from './credential-auth';

const HEADER_NAMES = {
  id: ['oai-authenticated-user-id', 'oai-authenticated-user-sub'],
  email: ['oai-authenticated-user-email'],
  name: ['oai-authenticated-user-name'],
  avatar: ['oai-authenticated-user-avatar-url', 'oai-authenticated-user-image-url'],
  trustedOrganization: ['oai-authenticated-user-organization-id'],
  selectedOrganization: ['x-organization-id'],
} as const;

export type OrganizationClaimSource =
  | 'identity_provider'
  | 'explicit_selection'
  | 'environment_default'
  | 'local_demo'
  | 'presentation_demo';

export interface RequestActor {
  userId: string;
  externalUserId: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  organizationId: string;
  organizationClaimSource: OrganizationClaimSource;
  source: 'authenticated' | 'local_demo' | 'presentation_demo';
  actorType: 'user';
}

export interface RequestOrganization {
  id: string;
  enterpriseId: string | null;
  slug: string;
  name: string;
  membershipRoleId: string | null;
  permissions: string[];
}

export interface ActorOptions {
  allowAnonymous?: boolean;
}

export async function getRequestActor(
  request: Request,
  options: ActorOptions = {},
): Promise<RequestActor | null> {
  const externalUserId = firstHeader(request.headers, HEADER_NAMES.id);
  if (externalUserId) {
    const email = firstHeader(request.headers, HEADER_NAMES.email);
    const displayName = firstHeader(request.headers, HEADER_NAMES.name) ?? email ?? 'Authenticated user';
    const trustedOrganizationId = firstHeader(request.headers, HEADER_NAMES.trustedOrganization);
    const selectedOrganizationId = firstHeader(request.headers, HEADER_NAMES.selectedOrganization);
    const defaultOrganizationId = readEnv('DEFAULT_ORGANIZATION_ID');
    const organizationId = selectedOrganizationId ?? trustedOrganizationId ?? defaultOrganizationId;
    if (!organizationId) {
      throw new ApiError(401, 'organization_required', 'Authenticated organization context is required');
    }
    const organizationClaimSource: OrganizationClaimSource = selectedOrganizationId
      ? selectedOrganizationId === trustedOrganizationId
        ? 'identity_provider'
        : 'explicit_selection'
      : trustedOrganizationId
        ? 'identity_provider'
        : 'environment_default';
    return {
      userId: await stableEntityId('user', externalUserId),
      externalUserId,
      ...(email ? { email } : {}),
      displayName,
      ...(firstHeader(request.headers, HEADER_NAMES.avatar)
        ? { avatarUrl: firstHeader(request.headers, HEADER_NAMES.avatar) }
        : {}),
      organizationId,
      organizationClaimSource,
      source: 'authenticated',
      actorType: 'user',
    };
  }

  const session = await readSessionClaims(request);
  if (session) {
    return {
      userId: await stableEntityId('user', session.sub),
      externalUserId: session.sub,
      email: session.email,
      displayName: session.name,
      organizationId: session.organization_id,
      organizationClaimSource: 'identity_provider',
      source: 'authenticated',
      actorType: 'user',
    };
  }

  if (demoActorEnabled() || presentationActorEnabled()) {
    const userId = readEnv('DEMO_ACTOR_USER_ID');
    const externalUserId = readEnv('DEMO_ACTOR_EXTERNAL_ID');
    const displayName = readEnv('DEMO_ACTOR_NAME');
    const organizationId = readEnv('DEFAULT_ORGANIZATION_ID');
    if (!userId || !externalUserId || !displayName || !organizationId) {
      throw new ApiError(
        503,
        'local_actor_misconfigured',
        'The explicitly enabled local actor is missing required identity configuration',
      );
    }
    const email = readEnv('DEMO_ACTOR_EMAIL');
    return {
      userId,
      externalUserId,
      ...(email ? { email } : {}),
      displayName,
      organizationId,
      organizationClaimSource: presentationActorEnabled() ? 'presentation_demo' : 'local_demo',
      source: presentationActorEnabled() ? 'presentation_demo' : 'local_demo',
      actorType: 'user',
    };
  }

  if (options.allowAnonymous) return null;
  throw new ApiError(401, 'unauthorized', 'Authenticated user headers are required');
}

export async function persistRequestActor(db: Database, actor: RequestActor): Promise<RequestActor> {
  const organization = await queryFirst<{ id: string }>(db, {
    sql: 'SELECT id FROM organizations WHERE id = ? AND status = ?',
    params: [actor.organizationId, 'active'],
  });
  if (!organization) {
    throw new ApiError(403, 'forbidden', 'The requested organization is unavailable');
  }

  const currentMembership = await queryFirst<{ status: string }>(db, {
    sql: `SELECT status FROM organization_user_memberships
      WHERE organization_id = ? AND user_id = ?`,
    params: [actor.organizationId, actor.userId],
  });
  if (currentMembership && currentMembership.status !== 'active') {
    throw new ApiError(403, 'organization_membership_inactive', 'Organization membership is not active');
  }
  const canProvisionMembership =
    currentMembership?.status === 'active' ||
    actor.organizationClaimSource === 'identity_provider' ||
    actor.source === 'local_demo' ||
    actor.source === 'presentation_demo' ||
    localMembershipProvisioningEnabled();
  if (!canProvisionMembership) {
    throw new ApiError(
      403,
      'organization_membership_required',
      'The authenticated user is not a member of the requested organization',
    );
  }

  const now = new Date().toISOString();
  const membershipId = await stableEntityId('membership', `${actor.organizationId}:${actor.userId}`);
  const statements = [
    {
      sql: `INSERT INTO app_users
        (id, external_user_id, email, display_name, avatar_url, status, profile_json, last_seen_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
        ON CONFLICT(external_user_id) DO UPDATE SET
          email = excluded.email,
          display_name = excluded.display_name,
          avatar_url = excluded.avatar_url,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at`,
      params: [
        actor.userId,
        actor.externalUserId,
        actor.email ?? null,
        actor.displayName,
        actor.avatarUrl ?? null,
        stringifyJson({ actor_source: actor.source }),
        now,
        now,
        now,
      ],
    },
  ];
  if (!currentMembership) {
    statements.push({
      sql: `INSERT INTO organization_user_memberships
        (id, organization_id, user_id, role_id, status, permissions_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', '[]', ?, ?)
        ON CONFLICT(organization_id, user_id) DO NOTHING`,
      params: [
        membershipId,
        actor.organizationId,
        actor.userId,
        readEnv('DEFAULT_NEW_USER_ROLE_ID') ?? 'role-owner',
        now,
        now,
      ],
    });
  }
  await executeBatch(db, statements);
  return actor;
}

export async function getRequestOrganization(
  db: Database,
  actor: RequestActor,
): Promise<RequestOrganization> {
  const row = await queryFirst<{
    id: string;
    enterprise_id: string | null;
    slug: string;
    name: string;
    role_id: string | null;
    permissions_json: string;
  }>(db, {
    sql: `SELECT o.id, o.enterprise_id, o.slug, o.name, m.role_id, m.permissions_json
      FROM organizations o
      JOIN organization_user_memberships m
        ON m.organization_id = o.id AND m.user_id = ? AND m.status = 'active'
      WHERE o.id = ? AND o.status = 'active'`,
    params: [actor.userId, actor.organizationId],
  });
  if (!row) {
    throw new ApiError(403, 'organization_scope_unavailable', 'Active organization scope is unavailable');
  }
  return {
    id: row.id,
    enterpriseId: row.enterprise_id,
    slug: row.slug,
    name: row.name,
    membershipRoleId: row.role_id,
    permissions: parsePermissions(row.permissions_json),
  };
}

export function demoActorEnabled(): boolean {
  const appEnvironment = (readEnv('APP_ENV') ?? '').toLowerCase();
  const explicitlyEnabled = (readEnv('ALLOW_DEMO_ACTOR') ?? '').toLowerCase() === 'true';
  return explicitlyEnabled && ['development', 'local', 'test'].includes(appEnvironment);
}

export function presentationActorEnabled(): boolean {
  const appEnvironment = (readEnv('APP_ENV') ?? '').toLowerCase();
  const explicitlyEnabled = (readEnv('ALLOW_PRESENTATION_ACTOR') ?? '').toLowerCase() === 'true';
  const organizationId = readEnv('DEFAULT_ORGANIZATION_ID');
  return explicitlyEnabled && appEnvironment === 'production' && organizationId === 'org-demo-guikesong';
}

function localMembershipProvisioningEnabled(): boolean {
  const appEnvironment = (readEnv('APP_ENV') ?? '').toLowerCase();
  return demoActorEnabled() && ['development', 'local', 'test'].includes(appEnvironment);
}

function parsePermissions(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function firstHeader(headers: Headers, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value.slice(0, 500);
  }
  return undefined;
}

function readEnv(name: string): string | undefined {
  const workerValue = (env as unknown as Record<string, unknown>)[name];
  if (typeof workerValue === 'string' && workerValue) return workerValue;
  const nodeValue = typeof process !== 'undefined' ? process.env[name] : undefined;
  return nodeValue || undefined;
}
