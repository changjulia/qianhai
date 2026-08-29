import { clearSessionCookie } from '../../../../lib/server/credential-auth';
import { jsonResponse, withApiErrors } from '../../../../lib/server/errors';

export async function POST(request: Request) {
  return withApiErrors(async (requestId) =>
    jsonResponse(
      { ok: true, requestId },
      { headers: { 'Set-Cookie': clearSessionCookie(request) } },
    ), request.headers.get('x-request-id') ?? crypto.randomUUID());
}
