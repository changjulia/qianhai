import { createHmac, timingSafeEqual } from 'node:crypto';

const IDENTITY_HEADERS = [
  'oai-authenticated-user-id',
  'oai-authenticated-user-sub',
  'oai-authenticated-user-email',
  'oai-authenticated-user-name',
  'oai-authenticated-user-avatar-url',
  'oai-authenticated-user-image-url',
  'oai-authenticated-user-organization-id',
  'x-organization-id',
  'x-openai-user-id',
  'x-openai-user-email',
  'x-openai-user-name',
  'x-openai-organization-id',
  'x-oai-user-id',
  'x-oai-user-email',
  'x-oai-user-name',
  'x-oai-organization-id',
  'cf-access-authenticated-user-email',
] as const;

const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/logout']);
const SESSION_COOKIE_NAME = 'qianhai_session';

interface JwtHeader {
  alg?: unknown;
  typ?: unknown;
}

interface JwtClaims {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
  picture?: unknown;
  organization_id?: unknown;
  organizationId?: unknown;
  org_id?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iss?: unknown;
  aud?: unknown;
}

export class GatewayError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
  }
}

export function assertAuthConfiguration(): void {
  if (testHeadersEnabled()) return;
  if (!process.env.AUTH_JWT_SECRET?.trim()) {
    throw new Error(
      'AUTH_JWT_SECRET is required unless APP_ENV is local/test and ALLOW_TEST_AUTH_HEADERS=true',
    );
  }
}

export function authenticateHeaders(input: Headers, pathname: string): Headers {
  const sanitized = new Headers(input);
  const testIdentity = captureTestIdentity(input);
  for (const name of IDENTITY_HEADERS) sanitized.delete(name);

  if (PUBLIC_PATHS.has(pathname)) {
    sanitized.delete('authorization');
    return sanitized;
  }

  const authorization = input.get('authorization');
  if (authorization) {
    const match = /^Bearer\s+([^\s]+)$/iu.exec(authorization);
    if (!match) throw new GatewayError(401, 'invalid_authorization', 'Bearer token is required');
    const secret = process.env.AUTH_JWT_SECRET?.trim();
    if (!secret) throw new GatewayError(503, 'auth_unavailable', 'JWT authentication is not configured');
    injectClaims(sanitized, verifyHs256Jwt(match[1], secret));
    sanitized.delete('authorization');
    return sanitized;
  }

  const sessionToken = readCookie(input.get('cookie'), SESSION_COOKIE_NAME);
  if (sessionToken) {
    const secret = process.env.AUTH_JWT_SECRET?.trim();
    if (!secret) throw new GatewayError(503, 'auth_unavailable', 'JWT authentication is not configured');
    injectClaims(sanitized, verifyHs256Jwt(sessionToken, secret));
    return sanitized;
  }

  if (testHeadersEnabled() && testIdentity) {
    injectTestIdentity(sanitized, testIdentity);
    return sanitized;
  }

  if (presentationActorEnabled()) {
    // The application layer resolves the fixed seeded presentation actor.
    // Do not synthesize identity headers here: they would be treated as a
    // real IdP user and could collide with the seeded demo account.
    return sanitized;
  }

  throw new GatewayError(401, 'unauthorized', 'Authorization: Bearer <token> is required');
}

function presentationActorEnabled(): boolean {
  return (
    process.env.APP_ENV?.toLowerCase() === 'production' &&
    process.env.ALLOW_PRESENTATION_ACTOR?.toLowerCase() === 'true' &&
    process.env.DEFAULT_ORGANIZATION_ID === 'org-demo-guikesong'
  );
}

function testHeadersEnabled(): boolean {
  const environment = (process.env.APP_ENV ?? '').toLowerCase();
  return (
    (environment === 'local' || environment === 'test') &&
    process.env.ALLOW_TEST_AUTH_HEADERS?.toLowerCase() === 'true'
  );
}

function captureTestIdentity(headers: Headers): Record<string, string> | null {
  if (!testHeadersEnabled()) return null;
  const userId =
    headers.get('oai-authenticated-user-id')?.trim() ??
    headers.get('oai-authenticated-user-sub')?.trim();
  const organizationId =
    headers.get('oai-authenticated-user-organization-id')?.trim() ??
    headers.get('x-organization-id')?.trim();
  if (!userId || !organizationId) return null;
  return {
    userId: bounded(userId, 'test user id'),
    organizationId: bounded(organizationId, 'test organization id'),
    ...(headers.get('oai-authenticated-user-email')?.trim()
      ? { email: bounded(headers.get('oai-authenticated-user-email')!.trim(), 'test email') }
      : {}),
    ...(headers.get('oai-authenticated-user-name')?.trim()
      ? { name: bounded(headers.get('oai-authenticated-user-name')!.trim(), 'test name') }
      : {}),
  };
}

function injectTestIdentity(headers: Headers, identity: Record<string, string>): void {
  headers.set('oai-authenticated-user-id', identity.userId);
  headers.set('oai-authenticated-user-organization-id', identity.organizationId);
  if (identity.email) headers.set('oai-authenticated-user-email', identity.email);
  if (identity.name) headers.set('oai-authenticated-user-name', identity.name);
}

function verifyHs256Jwt(token: string, secret: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new GatewayError(401, 'invalid_token', 'JWT must contain three segments');
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<JwtHeader>(encodedHeader, 4_096, 'JWT header');
  const claims = decodeJson<JwtClaims>(encodedPayload, 65_536, 'JWT payload');
  if (header.alg !== 'HS256') {
    throw new GatewayError(401, 'invalid_token', 'Only HS256 JWTs are accepted');
  }

  const expected = createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  const actual = decodeBase64Url(encodedSignature, 'JWT signature');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new GatewayError(401, 'invalid_token', 'JWT signature verification failed');
  }

  const now = Math.floor(Date.now() / 1_000);
  const tolerance = parsePositiveInteger(process.env.AUTH_JWT_CLOCK_TOLERANCE_SECONDS, 30);
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    throw new GatewayError(401, 'invalid_token', 'JWT exp claim is required');
  }
  if (claims.exp <= now - tolerance) throw new GatewayError(401, 'token_expired', 'JWT has expired');
  if (claims.nbf !== undefined) {
    if (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf)) {
      throw new GatewayError(401, 'invalid_token', 'JWT nbf claim must be numeric');
    }
    if (claims.nbf > now + tolerance) {
      throw new GatewayError(401, 'token_not_active', 'JWT is not active yet');
    }
  }
  assertIssuer(claims);
  assertAudience(claims);
  return claims;
}

function injectClaims(headers: Headers, claims: JwtClaims): void {
  const subject = requiredString(claims.sub, 'JWT sub claim');
  const organizationId = requiredString(
    claims.organization_id ?? claims.organizationId ?? claims.org_id,
    'JWT organization_id claim',
  );
  headers.set('oai-authenticated-user-id', subject);
  headers.set('oai-authenticated-user-organization-id', organizationId);
  const email = optionalString(claims.email, 'JWT email claim');
  const name = optionalString(claims.name ?? claims.preferred_username, 'JWT name claim');
  const picture = optionalString(claims.picture, 'JWT picture claim');
  if (email) headers.set('oai-authenticated-user-email', email);
  if (name) headers.set('oai-authenticated-user-name', name);
  if (picture) headers.set('oai-authenticated-user-avatar-url', picture);
}

function assertIssuer(claims: JwtClaims): void {
  const expected = process.env.AUTH_JWT_ISSUER?.trim();
  if (!expected) return;
  if (claims.iss !== expected) throw new GatewayError(401, 'invalid_token', 'JWT issuer is invalid');
}

function assertAudience(claims: JwtClaims): void {
  const expected = process.env.AUTH_JWT_AUDIENCE?.trim();
  if (!expected) return;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(expected)) {
    throw new GatewayError(401, 'invalid_token', 'JWT audience is invalid');
  }
}

function decodeJson<T>(value: string, maxBytes: number, label: string): T {
  const decoded = decodeBase64Url(value, label);
  if (decoded.byteLength > maxBytes) throw new GatewayError(401, 'invalid_token', `${label} is too large`);
  try {
    const parsed = JSON.parse(new TextDecoder().decode(decoded)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed as T;
  } catch {
    throw new GatewayError(401, 'invalid_token', `${label} is not valid JSON`);
  }
}

function decodeBase64Url(value: string, label: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new GatewayError(401, 'invalid_token', `${label} is not base64url encoded`);
  }
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    throw new GatewayError(401, 'invalid_token', `${label} is not base64url encoded`);
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GatewayError(401, 'invalid_token', `${label} is required`);
  }
  return bounded(value.trim(), label);
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new GatewayError(401, 'invalid_token', `${label} must be a string`);
  return value.trim() ? bounded(value.trim(), label) : undefined;
}

function bounded(value: string, label: string): string {
  if (value.length > 500) throw new GatewayError(401, 'invalid_token', `${label} is too long`);
  return value;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() === name) return pair.slice(separator + 1).trim();
  }
  return null;
}
