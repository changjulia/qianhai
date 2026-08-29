import {
  defaultOrganizationId,
  issueSessionToken,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
} from '../../../../lib/server/credential-auth';
import { execute, getDatabase, queryFirst } from '../../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../../lib/server/errors';
import { objectValue, readJsonBody, stringValue } from '../../../../lib/server/validation';

interface CredentialRow extends Record<string, unknown> {
  id: string;
  external_user_id: string;
  email: string;
  display_name: string;
  status: string;
  password_salt: string;
  password_hash: string;
  password_iterations: number;
}

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    const body = objectValue(await readJsonBody(request, { maxBytes: 16_000 }));
    const email = normalizeEmail(stringValue(body.email, 'email', { max: 254 }));
    const password = stringValue(body.password, 'password', { min: 1, max: 128, trim: false });
    const organizationId = defaultOrganizationId();
    const database = getDatabase();
    const account = await queryFirst<CredentialRow>(database, {
      sql: `SELECT u.id, u.external_user_id, u.email, u.display_name, u.status,
          c.password_salt, c.password_hash, c.password_iterations
        FROM app_users u
        JOIN app_user_credentials c ON c.user_id = u.id
        JOIN organization_user_memberships m ON m.user_id = u.id
        JOIN organizations o ON o.id = m.organization_id
        WHERE lower(u.email) = ? AND m.organization_id = ?
          AND m.status = 'active' AND o.status = 'active'`,
      params: [email, organizationId],
    });
    const passwordMatches = account
      ? await verifyPassword(password, account.password_salt, account.password_hash, account.password_iterations)
      : false;
    if (!account || !passwordMatches || account.status !== 'active') {
      throw new ApiError(401, 'invalid_credentials', '邮箱或密码不正确');
    }

    const now = new Date().toISOString();
    await execute(database, {
      sql: 'UPDATE app_users SET last_seen_at = ?, updated_at = ? WHERE id = ?',
      params: [now, now, account.id],
    });
    const token = await issueSessionToken({
      externalUserId: account.external_user_id,
      organizationId,
      email: account.email,
      name: account.display_name,
    });
    return jsonResponse(
      {
        ok: true,
        user: { id: account.id, email: account.email, name: account.display_name, organizationId },
        requestId,
      },
      { headers: { 'Set-Cookie': sessionCookie(token, request) } },
    );
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
