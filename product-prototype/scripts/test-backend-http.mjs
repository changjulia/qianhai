import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendEntry = resolve(projectRoot, process.env.BACKEND_ENTRY?.trim() || 'dist-backend/server.mjs');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'qianhai-backend-http-'));
const databasePath = join(temporaryDirectory, 'e2e.sqlite');
const port = 33_000 + Math.floor(Math.random() * 5_000);
const baseUrl = `http://127.0.0.1:${port}`;
const jwtSecret = 'e2e-only-secret-with-more-than-thirty-two-bytes';
const jwtIssuer = 'https://auth.e2e.qianhai.invalid';
const jwtAudience = 'qianhai-backend-e2e';
const runId = `e2e-${randomUUID()}`;
const primarySubject = `primary-${runId}`;
const isolatedSubject = `isolated-${runId}`;
const primaryOrganization = 'org-demo-guikesong';
const isolatedOrganization = `org-isolated-${runId}`;
const enterpriseId = 'ent-demo-matcha';
const logs = [];
let server;

try {
  await startServer({ ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION: 'false' });
  await waitForHealth();
  await assertTrialRegistrationRejected('default-disabled');
  await stopServer();

  await startServer({ ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION: 'true' });
  await waitForHealth();
  await runContractSuite();
  await stopServer();

  await startServer({
    APP_ENV: 'production',
    ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION: 'true',
  });
  await waitForHealth();
  await assertTrialRegistrationRejected('production-forbidden');
  console.log('[backend-http-e2e] PASS: registration gate, JWT/cookie auth, onboarding, org isolation, workflow, integrations, and search');
} catch (error) {
  console.error('[backend-http-e2e] FAIL:', error instanceof Error ? error.stack : error);
  if (logs.length) console.error('[backend-http-e2e] server log tail:\n' + logs.slice(-80).join(''));
  process.exitCode = 1;
} finally {
  await stopServer();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function runContractSuite() {
  const primaryToken = signToken(primarySubject, primaryOrganization);

  const health = await request('GET', '/api/health', { token: null, expected: 200 });
  assert.equal(health.body.ok, true);
  assert.equal(health.body.database.ok, true);
  assert.equal(health.body.schemaVersion, 14);

  const unauthenticated = await request('GET', '/api/onboarding', { token: null, expected: 401 });
  assert.equal(unauthenticated.body.error.code, 'unauthorized');
  const spoofOnly = await request('GET', '/api/onboarding', {
    token: null,
    expected: 401,
    headers: {
      'oai-authenticated-user-id': 'spoofed-user',
      'oai-authenticated-user-organization-id': isolatedOrganization,
      'x-organization-id': isolatedOrganization,
    },
  });
  assert.equal(spoofOnly.body.error.code, 'unauthorized');

  const credentialAccount = await runCredentialAuth();

  const firstLogin = await request('POST', '/api/onboarding/first-login', {
    token: primaryToken,
    expected: 200,
    headers: {
      'oai-authenticated-user-id': 'spoofed-user',
      'oai-authenticated-user-organization-id': isolatedOrganization,
      'x-organization-id': isolatedOrganization,
      'x-openai-user-id': 'spoofed-audit-user',
    },
  });
  assert.equal(firstLogin.body.ok, true);
  assert.equal(firstLogin.body.shouldStartOnboarding, true);
  assert.equal(firstLogin.body.onboarding.organizationId, primaryOrganization);
  assert.notEqual(firstLogin.body.onboarding.userId, 'spoofed-user');
  const primaryUserId = firstLogin.body.onboarding.userId;
  const issuedAt = firstLogin.body.issuedAt;

  const repeatedLogin = await request('POST', '/api/onboarding/first-login', {
    token: primaryToken,
    expected: 200,
  });
  assert.equal(repeatedLogin.body.shouldStartOnboarding, false);
  assert.equal(repeatedLogin.body.issuedAt, issuedAt);

  const inProgress = await request('PUT', '/api/onboarding', {
    token: primaryToken,
    expected: 200,
    body: {
      version: firstLogin.body.onboarding.version,
      config: { company: 'E2E 贵州企业', industry: '食品原料' },
    },
  });
  assert.equal(inProgress.body.onboarding.status, 'in_progress');
  assert.equal(inProgress.body.onboarding.config.company, 'E2E 贵州企业');

  const persistedConfig = await request('GET', '/api/onboarding', {
    token: primaryToken,
    expected: 200,
  });
  assert.deepEqual(persistedConfig.body.onboarding.config, inProgress.body.onboarding.config);

  const completed = await request('POST', '/api/onboarding/complete', {
    token: primaryToken,
    expected: 201,
    body: {
      version: inProgress.body.onboarding.version,
      config: {
        company: 'E2E 贵州企业',
        industry: '食品原料',
        product: '饮品级抹茶粉',
        market: '马来西亚',
        autonomy: '审批后执行',
      },
    },
  });
  assert.equal(completed.body.ok, true);
  assert.equal(completed.body.replayed, false);
  assert.equal(completed.body.onboarding.status, 'completed');
  assert.equal(completed.body.onboarding.firstGrowthTaskId, completed.body.task.id);
  assert.equal(completed.body.task.status, 'draft');
  assert.equal(completed.body.task.enterpriseId, enterpriseId);

  const replayedCompletion = await request('POST', '/api/onboarding/complete', {
    token: primaryToken,
    expected: 200,
    body: {
      version: completed.body.onboarding.version,
      config: {
        company: 'ignored replay', industry: 'ignored replay', product: 'ignored replay',
        market: 'ignored replay', autonomy: 'ignored replay',
      },
    },
  });
  assert.equal(replayedCompletion.body.replayed, true);
  assert.equal(replayedCompletion.body.task.id, completed.body.task.id);

  const initialKnowledge = await request('GET', `/api/knowledge?enterpriseId=${enterpriseId}`, {
    token: primaryToken,
    expected: 200,
  });
  const primaryKnowledge = await request('PUT', '/api/knowledge', {
    token: primaryToken,
    expected: 200,
    body: {
      enterpriseId,
      version: initialKnowledge.body.version,
      state: { marker: 'primary-organization', runId },
    },
  });
  assert.equal(primaryKnowledge.body.organizationId, primaryOrganization);

  insertIsolatedOrganization();
  const isolatedToken = signToken(isolatedSubject, isolatedOrganization);
  const isolatedLogin = await request('POST', '/api/onboarding/first-login', {
    token: isolatedToken,
    expected: 200,
  });
  assert.equal(isolatedLogin.body.onboarding.organizationId, isolatedOrganization);
  assert.equal(isolatedLogin.body.shouldStartOnboarding, true);

  const isolatedEmptyKnowledge = await request('GET', `/api/knowledge?enterpriseId=${enterpriseId}`, {
    token: isolatedToken,
    expected: 200,
  });
  assert.equal(isolatedEmptyKnowledge.body.state, null);
  assert.equal(isolatedEmptyKnowledge.body.version, 0);

  await request('PUT', '/api/knowledge', {
    token: isolatedToken,
    expected: 200,
    body: {
      enterpriseId,
      version: 0,
      state: { marker: 'isolated-organization', runId },
    },
  });
  const primaryKnowledgeAgain = await request('GET', `/api/knowledge?enterpriseId=${enterpriseId}`, {
    token: primaryToken,
    expected: 200,
  });
  assert.equal(primaryKnowledgeAgain.body.state.marker, 'primary-organization');

  const spoofedOrganizationHeader = await request('GET', `/api/knowledge?enterpriseId=${enterpriseId}`, {
    token: primaryToken,
    expected: 200,
    headers: {
      'oai-authenticated-user-organization-id': isolatedOrganization,
      'x-organization-id': isolatedOrganization,
    },
  });
  assert.equal(spoofedOrganizationHeader.body.organizationId, primaryOrganization);
  assert.equal(spoofedOrganizationHeader.body.state.marker, 'primary-organization');

  const forbiddenEnterprise = await request('GET', '/api/knowledge?enterpriseId=ent-outside-scope', {
    token: primaryToken,
    expected: 403,
  });
  assert.equal(forbiddenEnterprise.body.error.code, 'enterprise_scope_forbidden');

  const unknownOrganization = await request('GET', '/api/onboarding', {
    token: signToken(`unknown-${runId}`, `unknown-org-${runId}`),
    expected: 403,
  });
  assert.match(unknownOrganization.body.error.code, /forbidden|organization_scope_unavailable/u);

  await runWorkflow(primaryToken);

  const integrationId = `integration-${runId}`;
  const integrationFailure = await request('POST', '/api/platform', {
    token: primaryToken,
    expected: 409,
    body: {
      action: 'integration.test',
      payload: { id: integrationId, name: 'E2E connector', integrationType: 'custom' },
    },
  });
  assert.equal(integrationFailure.body.ok, false);
  assert.equal(integrationFailure.body.status, 'needs_configuration');
  assert.equal(integrationFailure.body.error, 'integration_needs_configuration');
  assert.equal(integrationFailure.body.testAttempted, false);

  const attemptedFailure = await request('POST', '/api/platform', {
    token: primaryToken,
    expected: 502,
    body: {
      action: 'integration.test',
      payload: {
        id: `integration-unreachable-${runId}`,
        name: 'E2E unreachable connector',
        integrationType: 'custom',
        endpointUrl: 'https://unreachable.invalid/health',
        secretRef: 'E2E_CONNECTOR_TOKEN',
      },
    },
  });
  assert.equal(attemptedFailure.body.ok, false);
  assert.equal(attemptedFailure.body.status, 'failed');
  assert.equal(attemptedFailure.body.error, 'integration_connection_failed');
  assert.equal(attemptedFailure.body.testAttempted, true);

  const unsupportedSync = await request('POST', '/api/platform', {
    token: primaryToken,
    expected: 501,
    body: { action: 'sync.run', payload: { integrationId } },
  });
  assert.equal(unsupportedSync.body.ok, false);
  assert.equal(unsupportedSync.body.status, 'unsupported');
  assert.equal(unsupportedSync.body.error, 'connector_worker_not_implemented');
  assert.equal(unsupportedSync.body.retryable, false);
  assert.equal(typeof unsupportedSync.body.runId, 'string');

  const unsupportedSearch = await request('GET', '/api/search?q=matcha', {
    token: primaryToken,
    expected: 501,
  });
  assert.equal(unsupportedSearch.body.ok, false);
  assert.equal(unsupportedSearch.body.status, 'unsupported');
  assert.equal(unsupportedSearch.body.mode, 'seeded_data');
  assert.equal(unsupportedSearch.body.networkAttempted, false);
  assert.deepEqual(unsupportedSearch.body.results, []);

  verifyDatabaseEvidence({
    primaryUserId,
    credentialAccount,
    integrationId,
    syncRunId: unsupportedSync.body.runId,
  });
}

async function runCredentialAuth() {
  const email = `credential-${runId}@example.invalid`;
  const password = 'E2E-password-2026!';
  const registration = await request('POST', '/api/auth/register', {
    token: null,
    expected: 201,
    body: { name: 'Credential E2E User', email, password },
  });
  assert.equal(registration.body.ok, true);
  assert.equal(registration.body.user.email, email);
  assert.equal(registration.body.user.organizationId, primaryOrganization);
  const registrationCookie = registration.headers.get('set-cookie');
  assert.match(registrationCookie, /^qianhai_session=/u);
  assert.match(registrationCookie, /HttpOnly/iu);
  assert.match(registrationCookie, /SameSite=Lax/iu);

  const duplicate = await request('POST', '/api/auth/register', {
    token: null,
    expected: 409,
    body: { name: 'Credential E2E User', email, password },
  });
  assert.equal(duplicate.body.error.code, 'account_exists');

  const firstLogin = await request('POST', '/api/onboarding/first-login', {
    token: null,
    expected: 200,
    headers: { Cookie: registrationCookie.split(';', 1)[0] },
  });
  assert.equal(firstLogin.body.shouldStartOnboarding, true);
  assert.equal(firstLogin.body.onboarding.userId, registration.body.user.id);

  const logout = await request('POST', '/api/auth/logout', {
    token: null,
    expected: 200,
    headers: { Cookie: registrationCookie.split(';', 1)[0] },
  });
  assert.equal(logout.body.ok, true);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/iu);

  const rejectedLogin = await request('POST', '/api/auth/login', {
    token: null,
    expected: 401,
    body: { email, password: 'incorrect-password' },
  });
  assert.equal(rejectedLogin.body.error.code, 'invalid_credentials');

  const login = await request('POST', '/api/auth/login', {
    token: null,
    expected: 200,
    body: { email, password },
  });
  assert.equal(login.body.user.id, registration.body.user.id);
  const loginCookie = login.headers.get('set-cookie');
  assert.match(loginCookie, /^qianhai_session=/u);
  const persistedIdentity = await request('GET', '/api/onboarding', {
    token: null,
    expected: 200,
    headers: { Cookie: loginCookie.split(';', 1)[0] },
  });
  assert.equal(persistedIdentity.body.onboarding.userId, registration.body.user.id);
  assert.equal(persistedIdentity.body.onboarding.organizationId, primaryOrganization);
  return { userId: registration.body.user.id, email, password };
}

async function assertTrialRegistrationRejected(label) {
  const registration = await request('POST', '/api/auth/register', {
    token: null,
    expected: 403,
    body: {
      name: 'Registration Gate E2E',
      email: `${label}-${runId}@example.invalid`,
      password: 'E2E-password-2026!',
    },
  });
  assert.equal(registration.body.error.code, 'single_tenant_trial_registration_disabled');
}

async function runWorkflow(token) {
  const workflow = async (action, payload = {}, expected = 200) => {
    const result = await request('POST', '/api/workflow', {
      token,
      expected,
      body: { action, runId, payload },
    });
    return result.body;
  };

  const unused = await workflow('get_run');
  assert.equal(sumCounts(unused.counts), 0);

  const task = await workflow('create_task', {
    name: `HTTP E2E task ${runId}`,
    targetMarket: 'MY',
    budgetCny: 12_000,
    productIds: ['prd-m02'],
    targetSegments: ['food_importer'],
  }, 201);
  const taskId = task.task.id;

  const content = await workflow('create_content', {
    taskId,
    title: `HTTP E2E content ${runId}`,
    language: 'en',
    channel: 'LinkedIn',
    body: 'Traceable supplier test content',
    cta: 'Request a sample',
  }, 201);
  const contentId = content.content.id;
  const contentReplay = await workflow('create_content', { taskId, title: 'must replay' });
  assert.equal(contentReplay.replayed, true);
  assert.equal(contentReplay.content.id, contentId);

  await workflow('schedule_content', {
    taskId, contentId, channel: 'LinkedIn', scheduledAt: '2030-01-01T09:00:00.000Z',
  }, 201);
  const campaign = await workflow('create_campaign', {
    taskId, name: `HTTP E2E campaign ${runId}`, market: 'MY', budgetCny: 3_000,
    contentIds: [contentId],
  }, 201);
  const campaignId = campaign.campaign.id;

  const customer = await workflow('create_customer', {
    displayName: `HTTP E2E customer ${runId}`,
    market: 'MY', companyType: 'food_importer', contactRole: 'procurement',
    sourceChannel: 'LinkedIn', interestedProductIds: ['prd-m02'],
  }, 201);
  const customerId = customer.customer.id;

  await workflow('create_inquiry', {
    customerId, campaignId, contentId, channel: 'WhatsApp',
    body: 'Please quote 500 kg and send specifications.',
  }, 201);
  const quote = await workflow('create_quote', {
    taskId, customerId, currency: 'CNY',
    items: [{ productId: 'prd-m02', quantity: 500, unitPrice: 180 }], validDays: 14,
  }, 201);
  assert.equal(quote.quote.status, 'draft');
  const quoteId = quote.quote.id;
  const opportunityId = quote.quote.opportunityId;

  const approval = await workflow('request_quote_approval', {
    quoteId, reason: 'HTTP E2E commercial approval',
  }, 201);
  assert.equal(approval.approval.status, 'pending');
  const decision = await workflow('decide_approval', {
    approvalId: approval.approval.id,
    decision: 'approved', note: 'Approved by isolated HTTP E2E test',
  });
  assert.equal(decision.approval.status, 'approved');
  assert.equal(decision.resumed.quote.status, 'approved');

  const order = await workflow('create_order', { quoteId, status: 'won' }, 201);
  assert.equal(order.order.status, 'won');
  const orderId = order.order.id;
  await workflow('record_attribution', {
    taskId, customerId, opportunityId, campaignId, contentId, orderId,
    sourceId: orderId, eventType: 'order_won', sourceType: 'campaign',
  }, 201);

  const snapshot = await workflow('get_run');
  assert.deepEqual(
    Object.fromEntries(['tasks', 'contents', 'schedules', 'campaigns', 'customers', 'inquiries', 'quotes', 'approvals', 'orders'].map((key) => [key, snapshot.counts[key]])),
    { tasks: 1, contents: 1, schedules: 1, campaigns: 1, customers: 1, inquiries: 1, quotes: 1, approvals: 1, orders: 1 },
  );
  assert.ok(snapshot.counts.attribution_events >= 1);
  assert.equal(snapshot.chain.orderId, orderId);
  assert.equal(snapshot.chain.quoteStatus, 'accepted');
  assert.equal(snapshot.chain.approvalStatus, 'approved');

  const cleanup = await workflow('cleanup_run');
  assert.equal(cleanup.ok, true);
  const afterCleanup = await workflow('get_run');
  assert.equal(sumCounts(afterCleanup.counts), 0);
  assert.equal(afterCleanup.foreignKeyViolations, 0);
}

function verifyDatabaseEvidence({ primaryUserId, credentialAccount, integrationId, syncRunId }) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const onboarding = database.prepare(`SELECT status, first_growth_task_id
      FROM organization_onboarding_states WHERE organization_id=? AND user_id=?`).get(primaryOrganization, primaryUserId);
    assert.equal(onboarding.status, 'completed');
    assert.equal(typeof onboarding.first_growth_task_id, 'string');

    const knowledgeRows = database.prepare(`SELECT organization_id, state_json
      FROM organization_enterprise_knowledge_state WHERE enterprise_id=?
        AND organization_id IN (?, ?) ORDER BY organization_id`).all(enterpriseId, primaryOrganization, isolatedOrganization);
    assert.equal(knowledgeRows.length, 2);
    assert.deepEqual(new Set(knowledgeRows.map((row) => JSON.parse(row.state_json).marker)), new Set(['primary-organization', 'isolated-organization']));

    const sync = database.prepare('SELECT status, completed_at, details_json FROM sync_runs WHERE id=?').get(syncRunId);
    assert.equal(sync.status, 'unsupported');
    assert.equal(typeof sync.completed_at, 'string');
    assert.equal(JSON.parse(sync.details_json).reason, 'connector_worker_not_implemented');

    const audit = database.prepare(`SELECT actor_id, result FROM security_audit_events
      WHERE action='integration.test' AND resource_id=? ORDER BY occurred_at DESC LIMIT 1`).get(integrationId);
    assert.equal(audit.actor_id, primaryUserId);
    assert.equal(audit.result, 'needs_configuration');

    const credential = database.prepare(`SELECT u.email, c.password_salt, c.password_hash,
        c.password_iterations
      FROM app_users u JOIN app_user_credentials c ON c.user_id=u.id WHERE u.id=?`).get(credentialAccount.userId);
    assert.equal(credential.email, credentialAccount.email);
    assert.notEqual(credential.password_hash, credentialAccount.password);
    assert.notEqual(credential.password_salt, credentialAccount.password);
    assert.ok(credential.password_iterations >= 100_000);

    assert.equal(database.prepare('PRAGMA foreign_key_check').all().length, 0);
    const migrations = database.prepare('SELECT name FROM _node_schema_migrations ORDER BY name').all();
    assert.ok(migrations.length >= 10);
    assert.ok(migrations.some((row) => row.name === '0011_onboarding_and_knowledge_scope.sql'));
    assert.ok(migrations.some((row) => row.name === '0014_account_credentials.sql'));
  } finally {
    database.close();
  }
}

function insertIsolatedOrganization() {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare(`INSERT INTO organizations
      (id, enterprise_id, slug, name, status, settings_json)
      VALUES (?, ?, ?, ?, 'active', '{}')`).run(
      isolatedOrganization,
      enterpriseId,
      `isolated-${runId}`,
      'E2E isolated organization',
    );
  } finally {
    database.close();
  }
}

async function request(method, path, { token = undefined, body, expected = 200, headers = {} } = {}) {
  const requestHeaders = new Headers(headers);
  if (token === undefined) throw new Error(`Test request ${method} ${path} must explicitly set token`);
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${path} returned non-JSON HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(allowed.includes(response.status), `${method} ${path}: expected HTTP ${allowed.join('/')}, got ${response.status}: ${text.slice(0, 1_000)}`);
  return { status: response.status, body: parsed, headers: response.headers };
}

function signToken(subject, organizationId) {
  const now = Math.floor(Date.now() / 1_000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: subject,
    organization_id: organizationId,
    email: `${subject}@example.invalid`,
    name: `HTTP E2E ${subject}`,
    iss: jwtIssuer,
    aud: jwtAudience,
    iat: now,
    exp: now + 600,
  });
  const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sumCounts(counts) {
  return Object.values(counts ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
}

async function startServer(overrides = {}) {
  server = spawn(process.execPath, [backendEntry], {
    cwd: projectRoot,
    windowsHide: true,
    env: {
      ...process.env,
      APP_ENV: 'test',
      ALLOW_DEMO_ACTOR: 'false',
      ALLOW_TEST_AUTH_HEADERS: 'false',
      ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION: 'false',
      AUTH_JWT_SECRET: jwtSecret,
      AUTH_JWT_ISSUER: jwtIssuer,
      AUTH_JWT_AUDIENCE: jwtAudience,
      E2E_CONNECTOR_TOKEN: 'not-a-real-external-token',
      DEFAULT_ORGANIZATION_ID: primaryOrganization,
      DEFAULT_NEW_USER_ROLE_ID: 'role-owner',
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_PATH: databasePath,
      CORS_ALLOWED_ORIGINS: '',
      ...overrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  server.stderr.on('data', (chunk) => logs.push(chunk.toString()));
}

async function waitForHealth() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Backend exited before health check with code ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1_000) });
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
