import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configuredEntry = process.env.BACKEND_ENTRY?.trim() || 'dist-backend/server.mjs';
const backendEntry = isAbsolute(configuredEntry)
  ? configuredEntry
  : resolve(projectRoot, configuredEntry);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'qianhai-onboarding-http-'));
const databasePath = join(temporaryDirectory, 'onboarding.sqlite');
const port = 38_000 + Math.floor(Math.random() * 2_000);
const baseUrl = `http://127.0.0.1:${port}`;
const jwtSecret = 'onboarding-test-secret-with-more-than-thirty-two-bytes';
const subject = `new-account-${randomUUID()}`;
const primaryOrganization = 'org-demo-guikesong';
const secondaryOrganization = `org-onboarding-${randomUUID()}`;
const enterpriseId = 'ent-demo-matcha';
const logs = [];
let server;

try {
  await startServer();
  await waitForHealth();
  await runContract();
  console.log('[onboarding-http] PASS');
  console.log('first login=true; repeat and cross-organization login=false');
  console.log('completion creates one task; replay returns the same task');
} catch (error) {
  console.error('[onboarding-http] FAIL:', error instanceof Error ? error.stack : error);
  if (logs.length) console.error('[onboarding-http] server log tail:\n' + logs.slice(-50).join(''));
  process.exitCode = 1;
} finally {
  await stopServer();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function runContract() {
  await request('POST', '/api/onboarding/first-login', { token: null, expected: 401 });

  const primaryToken = signToken(primaryOrganization);
  const firstLogin = await request('POST', '/api/onboarding/first-login', {
    token: primaryToken,
    expected: 200,
  });
  assert.equal(firstLogin.ok, true);
  assert.equal(firstLogin.shouldStartOnboarding, true);
  assert.equal(firstLogin.onboarding.status, 'issued');
  assert.equal(firstLogin.onboarding.organizationId, primaryOrganization);
  assert.equal(typeof firstLogin.issuedAt, 'string');

  const repeatedLogin = await request('POST', '/api/onboarding/first-login', {
    token: primaryToken,
    expected: 200,
  });
  assert.equal(repeatedLogin.shouldStartOnboarding, false);
  assert.equal(repeatedLogin.issuedAt, firstLogin.issuedAt);

  insertSecondaryOrganization();
  const secondaryLogin = await request('POST', '/api/onboarding/first-login', {
    token: signToken(secondaryOrganization),
    expected: 200,
  });
  assert.equal(secondaryLogin.shouldStartOnboarding, false);
  assert.equal(secondaryLogin.issuedAt, firstLogin.issuedAt);

  const completed = await request('POST', '/api/onboarding/complete', {
    token: primaryToken,
    expected: 201,
    body: {
      version: firstLogin.onboarding.version,
      config: {
        company: 'Onboarding HTTP Test',
        industry: '食品原料',
        product: '饮品级抹茶粉',
        market: '马来西亚',
        autonomy: '审批后执行',
      },
    },
  });
  assert.equal(completed.replayed, false);
  assert.equal(completed.onboarding.status, 'completed');
  assert.equal(completed.onboarding.firstGrowthTaskId, completed.task.id);

  const replayed = await request('POST', '/api/onboarding/complete', {
    token: primaryToken,
    expected: 200,
    body: {
      version: completed.onboarding.version,
      config: {
        company: 'Ignored replay',
        industry: 'Ignored replay',
        product: 'Ignored replay',
        market: 'Ignored replay',
        autonomy: 'Ignored replay',
      },
    },
  });
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.task.id, completed.task.id);

  const afterCompletion = await request('POST', '/api/onboarding/first-login', {
    token: primaryToken,
    expected: 200,
  });
  assert.equal(afterCompletion.shouldStartOnboarding, false);
  assert.equal(afterCompletion.onboarding.status, 'completed');
}

function insertSecondaryOrganization() {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare(`INSERT INTO organizations
      (id, enterprise_id, slug, name, status, settings_json)
      VALUES (?, ?, ?, ?, 'active', '{}')`).run(
      secondaryOrganization,
      enterpriseId,
      secondaryOrganization,
      'Onboarding secondary organization',
    );
  } finally {
    database.close();
  }
}

async function request(method, path, { token, expected, body } = {}) {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected HTTP ${expected}, got ${response.status}: ${text.slice(0, 1_000)}`,
  );
  return payload;
}

function signToken(organizationId) {
  const now = Math.floor(Date.now() / 1_000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: subject,
    organization_id: organizationId,
    email: `${subject}@example.invalid`,
    name: 'Onboarding HTTP Test',
    iat: now,
    exp: now + 600,
  });
  const signature = createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function startServer() {
  server = spawn(process.execPath, [backendEntry], {
    cwd: projectRoot,
    windowsHide: true,
    env: {
      ...process.env,
      APP_ENV: 'test',
      ALLOW_DEMO_ACTOR: 'false',
      ALLOW_TEST_AUTH_HEADERS: 'false',
      AUTH_JWT_SECRET: jwtSecret,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_PATH: databasePath,
      CORS_ALLOWED_ORIGINS: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  server.stderr.on('data', (chunk) => logs.push(chunk.toString()));
}

async function waitForHealth() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before health check with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.status === 200) return;
    } catch {
      // Startup and migrations are still in progress.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error('Backend did not become healthy within 30 seconds');
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolvePromise) => server.once('exit', resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
