import { env } from 'cloudflare:workers';
import { ApiError } from './errors';

export const SESSION_COOKIE_NAME = 'qianhai_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const PASSWORD_ITERATIONS = 210_000;

export interface SessionClaims {
  sub: string;
  organization_id: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

export interface PasswordDigest {
  salt: string;
  hash: string;
  iterations: number;
}

export async function stableEntityId(namespace: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${namespace}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${namespace}-${hash}`;
}

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new ApiError(422, 'validation_error', '请输入有效的工作邮箱', {
      field: 'email',
      reason: 'invalid_email',
    });
  }
  return email;
}

export async function hashPassword(password: string): Promise<PasswordDigest> {
  assertPassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return {
    salt: encodeBytes(salt),
    hash: encodeBytes(hash),
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number,
): Promise<boolean> {
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  let saltBytes: Uint8Array;
  let expected: Uint8Array;
  try {
    saltBytes = decodeBytes(salt);
    expected = decodeBytes(expectedHash);
  } catch {
    return false;
  }
  const actual = await derivePassword(password, saltBytes, iterations);
  return constantTimeEqual(actual, expected);
}

export async function issueSessionToken(input: {
  externalUserId: string;
  organizationId: string;
  email: string;
  name: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1_000);
  const issuer = serverEnv('AUTH_JWT_ISSUER');
  const audience = serverEnv('AUTH_JWT_AUDIENCE');
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({
    sub: input.externalUserId,
    organization_id: input.organizationId,
    email: input.email,
    name: input.name,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    ...(issuer ? { iss: issuer } : {}),
    ...(audience ? { aud: audience } : {}),
  } satisfies SessionClaims);
  const signingInput = `${header}.${payload}`;
  const signature = await hmac(new TextEncoder().encode(signingInput));
  return `${signingInput}.${encodeBytes(signature)}`;
}

export async function readSessionClaims(request: Request): Promise<SessionClaims | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new ApiError(401, 'invalid_session', '登录状态无效，请重新登录');
  }
  const [header, payload, signature] = parts;
  const parsedHeader = decodeJson<{ alg?: unknown; typ?: unknown }>(header);
  const claims = decodeJson<Partial<SessionClaims>>(payload);
  if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') {
    throw new ApiError(401, 'invalid_session', '登录状态无效，请重新登录');
  }
  const expected = await hmac(new TextEncoder().encode(`${header}.${payload}`));
  if (!constantTimeEqual(expected, decodeBytes(signature))) {
    throw new ApiError(401, 'invalid_session', '登录状态无效，请重新登录');
  }
  if (
    typeof claims.sub !== 'string' || !claims.sub ||
    typeof claims.organization_id !== 'string' || !claims.organization_id ||
    typeof claims.email !== 'string' || !claims.email ||
    typeof claims.name !== 'string' || !claims.name ||
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    claims.exp <= Math.floor(Date.now() / 1_000)
  ) {
    throw new ApiError(401, 'invalid_session', '登录已过期，请重新登录');
  }
  const expectedIssuer = serverEnv('AUTH_JWT_ISSUER');
  if (expectedIssuer && claims.iss !== expectedIssuer) {
    throw new ApiError(401, 'invalid_session', '登录状态签发方无效，请重新登录');
  }
  const expectedAudience = serverEnv('AUTH_JWT_AUDIENCE');
  if (expectedAudience && claims.aud !== expectedAudience) {
    throw new ApiError(401, 'invalid_session', '登录状态受众无效，请重新登录');
  }
  return claims as SessionClaims;
}

export function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' || serverEnv('APP_ENV') === 'production';
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' || serverEnv('APP_ENV') === 'production';
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function defaultOrganizationId(): string {
  const organizationId = serverEnv('DEFAULT_ORGANIZATION_ID');
  if (!organizationId) {
    throw new ApiError(503, 'auth_unavailable', '默认组织尚未配置');
  }
  return organizationId;
}

export function defaultRoleId(): string {
  return serverEnv('DEFAULT_NEW_USER_ROLE_ID') ?? 'role-owner';
}

export function assertSingleTenantTrialRegistrationEnabled(): void {
  const environment = (serverEnv('APP_ENV') ?? '').toLowerCase();
  const explicitlyEnabled =
    (serverEnv('ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION') ?? '').toLowerCase() === 'true';
  const trialEnvironment = ['development', 'local', 'test'].includes(environment);
  if (!explicitlyEnabled || !trialEnvironment) {
    throw new ApiError(
      403,
      'single_tenant_trial_registration_disabled',
      '公开注册仅用于显式启用的单租户本地试用，当前环境未开放注册',
    );
  }
}

function assertPassword(password: string): void {
  if (password.length < 8 || password.length > 128) {
    throw new ApiError(422, 'validation_error', '密码长度必须为 8–128 个字符', {
      field: 'password',
      reason: 'invalid_length',
    });
  }
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: ownedBuffer(salt), iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

async function hmac(value: Uint8Array): Promise<Uint8Array> {
  const secret = serverEnv('AUTH_JWT_SECRET');
  if (!secret || secret.length < 32) {
    throw new ApiError(503, 'auth_unavailable', '认证会话密钥尚未安全配置');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ownedBuffer(value)));
}

function ownedBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function encodeJson(value: unknown): string {
  return encodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBytes(value))) as T;
  } catch (cause) {
    throw new ApiError(401, 'invalid_session', '登录状态无效，请重新登录', undefined, { cause });
  }
}

function encodeBytes(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('invalid base64url');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

function serverEnv(name: string): string | undefined {
  const workerValue = (env as unknown as Record<string, unknown>)[name];
  if (typeof workerValue === 'string' && workerValue) return workerValue;
  const nodeValue = typeof process !== 'undefined' ? process.env[name] : undefined;
  return nodeValue || undefined;
}
