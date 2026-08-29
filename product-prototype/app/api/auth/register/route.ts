import {
  assertSingleTenantTrialRegistrationEnabled,
  defaultOrganizationId,
  defaultRoleId,
  hashPassword,
  issueSessionToken,
  normalizeEmail,
  sessionCookie,
  stableEntityId,
} from '../../../../lib/server/credential-auth';
import { getDatabase, queryFirst, transaction } from '../../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../../lib/server/errors';
import { stringifyJson } from '../../../../lib/server/json';
import { objectValue, readJsonBody, stringValue } from '../../../../lib/server/validation';

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    assertSingleTenantTrialRegistrationEnabled();
    const body = objectValue(await readJsonBody(request, { maxBytes: 16_000 }));
    const name = stringValue(body.name, 'name', { min: 2, max: 100 });
    const email = normalizeEmail(stringValue(body.email, 'email', { max: 254 }));
    const password = stringValue(body.password, 'password', { min: 8, max: 128, trim: false });
    const organizationId = defaultOrganizationId();
    const externalUserId = `credentials:${email}`;
    const userId = await stableEntityId('user', externalUserId);
    const membershipId = await stableEntityId('membership', `${organizationId}:${userId}`);
    const database = getDatabase();

    const organization = await queryFirst<{ id: string }>(database, {
      sql: 'SELECT id FROM organizations WHERE id = ? AND status = ?',
      params: [organizationId, 'active'],
    });
    if (!organization) throw new ApiError(503, 'auth_unavailable', '默认组织不可用');

    const existing = await queryFirst<{ id: string }>(database, {
      sql: 'SELECT id FROM app_users WHERE lower(email) = ?',
      params: [email],
    });
    if (existing) throw new ApiError(409, 'account_exists', '该邮箱已注册，请直接登录');

    const digest = await hashPassword(password);
    const now = new Date().toISOString();
    try {
      await transaction(database, [
        {
          sql: `INSERT INTO app_users
            (id, external_user_id, email, display_name, status, profile_json,
             last_seen_at, created_at, updated_at, onboarding_task_issued_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, NULL)`,
          params: [
            userId,
            externalUserId,
            email,
            name,
            stringifyJson({ actor_source: 'credentials' }),
            now,
            now,
            now,
          ],
        },
        {
          sql: `INSERT INTO organization_user_memberships
            (id, organization_id, user_id, role_id, status, permissions_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', '[]', ?, ?)`,
          params: [membershipId, organizationId, userId, defaultRoleId(), now, now],
        },
        {
          sql: `INSERT INTO app_user_credentials
            (user_id, password_salt, password_hash, password_iterations, password_updated_at,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [userId, digest.salt, digest.hash, digest.iterations, now, now, now],
        },
      ]);
    } catch (cause) {
      const duplicate = await queryFirst<{ id: string }>(database, {
        sql: 'SELECT id FROM app_users WHERE lower(email) = ?',
        params: [email],
      });
      if (duplicate) throw new ApiError(409, 'account_exists', '该邮箱已注册，请直接登录');
      throw new ApiError(500, 'account_creation_failed', '账号创建失败，请稍后重试', undefined, { cause });
    }

    const token = await issueSessionToken({ externalUserId, organizationId, email, name });
    return jsonResponse(
      { ok: true, user: { id: userId, email, name, organizationId }, requestId },
      { status: 201, headers: { 'Set-Cookie': sessionCookie(token, request) } },
    );
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
