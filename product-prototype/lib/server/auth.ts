import { env } from 'cloudflare:workers';
import { ApiError } from './errors';
import { executeBatch, queryFirst, type Database } from './d1';
import { stringifyJson } from './json';

const HEADER_NAMES = {
  id: ['oai-authenticated-user-id', 'oai-authenticated-user-sub'],
  email: ['oai-authenticated-user-email'],
  name: ['oai-authenticated-user-name'],
  avatar: ['oai-authenticated-user-avatar-url', 'oai-authenticated-user-image-url'],
  organization: ['oai-authenticated-user-organization-id', 'x-organization-id'],
} as const;

export interface RequestActor {
  userId: string;
  externalUserId: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  organizationId: string;
  source: 'authenticated' | 'local_demo';
  actorType: 'user';
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
    const organizationId =
      firstHeader(request.headers, HEADER_NAMES.organization) ??
      readEnv('DEFAULT_ORGANIZATION_ID') ??
      'org-demo-guikesong';
    return {
      userId: await stableId('user', externalUserId),
      externalUserId,
      ...(email ? { email } : {}),
      displayName,
      ...(firstHeader(request.headers, HEADER_NAMES.avatar)
        ? { avatarUrl: firstHeader(request.headers, HEADER_NAMES.avatar) }
        : {}),
      organizationId,
      source: 'authenticated',
      actorType: 'user',
    };
  }

  if (demoActorEnabled()) {
    return {
      userId: readEnv('DEMO_ACTOR_USER_ID') ?? 'user-demo-local',
      externalUserId: readEnv('DEMO_ACTOR_EXTERNAL_ID') ?? 'demo-local-user',
      email: readEnv('DEMO_ACTOR_EMAIL') ?? 'demo@example.invalid',
      displayName: readEnv('DEMO_ACTOR_NAME') ?? '本地 Demo 用户',
      organizationId: readEnv('DEFAULT_ORGANIZATION_ID') ?? 'org-demo-guikesong',
      source: 'local_demo',
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

  const now = new Date().toISOString();
  const membershipId = await stableId('membership', `${actor.organizationId}:${actor.userId}`);
  await executeBatch(db, [
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
    {
      sql: `INSERT INTO organization_user_memberships
        (id, organization_id, user_id, role_id, status, permissions_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', '[]', ?, ?)
        ON CONFLICT(organization_id, user_id) DO UPDATE SET
          status = 'active',
          updated_at = excluded.updated_at`,
      params: [
        membershipId,
        actor.organizationId,
        actor.userId,
        readEnv('DEFAULT_NEW_USER_ROLE_ID') ?? 'role-owner',
        now,
        now,
      ],
    },
  ]);
  return actor;
}

export function demoActorEnabled(): boolean {
  const appEnvironment = (readEnv('APP_ENV') ?? '').toLowerCase();
  const explicitlyEnabled = (readEnv('ALLOW_DEMO_ACTOR') ?? '').toLowerCase() === 'true';
  return explicitlyEnabled && ['development', 'local', 'test'].includes(appEnvironment);
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

async function stableId(namespace: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${namespace}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${namespace}-${hash}`;
}
