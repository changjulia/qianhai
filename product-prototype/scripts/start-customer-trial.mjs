#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { statSync } from 'node:fs';
import { createServer, request as createUpstreamRequest } from 'node:http';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const LOCAL_HOST = '127.0.0.1';
const DEFAULT_BACKEND_PORT = 8787;
const DEFAULT_FRONTEND_PORT = 4177;
const DEFAULT_PROXY_PORT = 4180;
const DEFAULT_STARTUP_TIMEOUT_MS = 60_000;
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const backendPort = readPort('CUSTOMER_TRIAL_BACKEND_PORT', DEFAULT_BACKEND_PORT);
const frontendPort = readPort('CUSTOMER_TRIAL_FRONTEND_PORT', DEFAULT_FRONTEND_PORT);
const proxyPort = readPort('CUSTOMER_TRIAL_PORT', DEFAULT_PROXY_PORT);
const startupTimeoutMs = readPositiveInteger(
  'CUSTOMER_TRIAL_STARTUP_TIMEOUT_MS',
  DEFAULT_STARTUP_TIMEOUT_MS,
);

assertLocalTrialConfiguration();
assertDistinctPorts();
assertBuildsExist();

const configuredSecret = process.env.AUTH_JWT_SECRET?.trim();
if (configuredSecret && configuredSecret.length < 32) {
  throw new Error('AUTH_JWT_SECRET must contain at least 32 characters for the customer trial runtime.');
}
const authJwtSecret = configuredSecret || randomBytes(48).toString('base64url');
const databasePath = resolveTrialDatabasePath(process.env.CUSTOMER_TRIAL_DATABASE_PATH);

const children = new Set();
let startupComplete = false;
let shutdownPromise;

const proxy = createServer(proxyRequest);
proxy.requestTimeout = 30_000;
proxy.headersTimeout = 15_000;
proxy.keepAliveTimeout = 5_000;
proxy.on('clientError', (_error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});
proxy.on('error', (error) => {
  if (!startupComplete || shutdownPromise) return;
  console.error(`Customer trial proxy failed: ${error.message}`);
  void shutdown(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shutdownPromise) {
      forceKillChildren();
      return;
    }
    console.log(`\nReceived ${signal}; stopping the local customer trial.`);
    void shutdown(0);
  });
}

process.on('uncaughtException', (error) => {
  console.error('Customer trial runtime crashed:', error);
  void shutdown(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Customer trial runtime rejected an operation:', error);
  void shutdown(1);
});

process.on('exit', forceKillChildren);

try {
  await start();
} catch (error) {
  console.error(`Unable to start the customer trial: ${error instanceof Error ? error.message : error}`);
  await shutdown(1);
}

async function start() {
  const backend = startChild(
    'backend',
    [resolve(projectRoot, 'dist-backend', 'server.mjs')],
    {
      APP_ENV: 'development',
      ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION: 'true',
      AUTH_JWT_SECRET: authJwtSecret,
      DATABASE_PATH: databasePath,
      DEFAULT_ORGANIZATION_ID: process.env.DEFAULT_ORGANIZATION_ID?.trim() || 'org-demo-guikesong',
      HOST: LOCAL_HOST,
      PORT: String(backendPort),
    },
  );

  const frontend = startChild(
    'frontend',
    [
      resolve(projectRoot, 'node_modules', 'vinext', 'dist', 'cli.js'),
      'start',
      '--hostname',
      LOCAL_HOST,
      '--port',
      String(frontendPort),
    ],
    { APP_ENV: 'development' },
  );

  await Promise.all([
    waitForReady({
      name: 'backend health check',
      url: `http://${LOCAL_HOST}:${backendPort}/api/health`,
      child: backend,
      validate: async (response) => {
        if (response.status !== 200) return false;
        const body = await response.json();
        return body?.ok === true && body?.database?.ok === true;
      },
    }),
    waitForReady({
      name: 'frontend root',
      url: `http://${LOCAL_HOST}:${frontendPort}/`,
      child: frontend,
      validate: async (response) => {
        await response.body?.cancel();
        return response.status >= 200 && response.status < 400;
      },
    }),
  ]);

  assertChildRunning(backend);
  assertChildRunning(frontend);
  await listen(proxy, proxyPort, LOCAL_HOST);
  startupComplete = true;
  assertChildRunning(backend);
  assertChildRunning(frontend);

  console.log('Local customer trial is ready. Production mode is disabled for this launcher.');
  console.log(`Open: http://${LOCAL_HOST}:${proxyPort}`);
  console.log(`Persistent trial data: ${databasePath}`);
  console.log('Press Ctrl+C to stop the frontend, backend, and proxy.');
}

function startChild(name, arguments_, environment) {
  const state = {
    name,
    child: spawn(process.execPath, arguments_, {
      cwd: projectRoot,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
      windowsHide: true,
    }),
    spawnError: undefined,
    exit: undefined,
  };
  children.add(state);

  state.child.once('error', (error) => {
    state.spawnError = error;
    if (startupComplete && !shutdownPromise) {
      console.error(`${name} process failed: ${error.message}`);
      void shutdown(1);
    }
  });

  state.child.once('exit', (code, signal) => {
    state.exit = { code, signal };
    if (startupComplete && !shutdownPromise) {
      console.error(`${name} exited unexpectedly (${describeExit(state.exit)}).`);
      void shutdown(1);
    }
  });

  return state;
}

async function waitForReady({ name, url, child, validate }) {
  const deadline = Date.now() + startupTimeoutMs;
  let lastFailure = 'no response';

  while (Date.now() < deadline) {
    assertChildRunning(child);
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(1_500),
      });
      if (await validate(response)) return;
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }

  throw new Error(`${name} did not become ready within ${startupTimeoutMs} ms (${lastFailure}).`);
}

function assertChildRunning(state) {
  if (state.spawnError) throw new Error(`${state.name} could not start: ${state.spawnError.message}`);
  if (state.exit) throw new Error(`${state.name} exited before startup completed (${describeExit(state.exit)}).`);
}

function proxyRequest(incoming, outgoing) {
  let pathname;
  try {
    pathname = new URL(incoming.url || '/', `http://${LOCAL_HOST}`).pathname;
  } catch {
    outgoing.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    outgoing.end('Invalid request URL');
    return;
  }

  const targetPort = pathname === '/api' || pathname.startsWith('/api/')
    ? backendPort
    : frontendPort;
  const originalHost = incoming.headers.host || `${LOCAL_HOST}:${proxyPort}`;
  const headers = sanitizeHeaders(incoming.headers);
  headers.host = originalHost;
  headers['x-forwarded-host'] = originalHost;
  headers['x-forwarded-port'] = String(proxyPort);
  headers['x-forwarded-proto'] = 'http';
  if (incoming.socket.remoteAddress) {
    headers['x-forwarded-for'] = appendForwardedFor(headers['x-forwarded-for'], incoming.socket.remoteAddress);
  }

  const upstream = createUpstreamRequest(
    {
      hostname: LOCAL_HOST,
      port: targetPort,
      method: incoming.method,
      path: incoming.url,
      headers,
    },
    (response) => {
      outgoing.writeHead(response.statusCode || 502, sanitizeHeaders(response.headers));
      response.pipe(outgoing);
    },
  );

  upstream.on('error', (error) => {
    if (outgoing.headersSent) {
      outgoing.destroy(error);
      return;
    }
    outgoing.writeHead(502, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    });
    outgoing.end(JSON.stringify({ error: { code: 'trial_upstream_unavailable', message: 'Local trial service is unavailable' } }));
  });
  incoming.on('aborted', () => upstream.destroy());
  incoming.pipe(upstream);
}

function sanitizeHeaders(input) {
  const blocked = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
  ]);
  const connection = input.connection;
  if (typeof connection === 'string') {
    for (const name of connection.split(',')) blocked.add(name.trim().toLowerCase());
  }

  const output = {};
  for (const [name, value] of Object.entries(input)) {
    if (value !== undefined && !blocked.has(name.toLowerCase())) output[name] = value;
  }
  return output;
}

function appendForwardedFor(existing, address) {
  if (Array.isArray(existing)) return [...existing, address].join(', ');
  return existing ? `${existing}, ${address}` : address;
}

function listen(server, port, host) {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (error) => rejectPromise(error);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolvePromise();
    });
  });
}

function shutdown(exitCode) {
  if (shutdownPromise) {
    if (exitCode !== 0) process.exitCode = exitCode;
    return shutdownPromise;
  }

  process.exitCode = exitCode;
  shutdownPromise = (async () => {
    startupComplete = false;
    await closeProxy();
    await Promise.all([...children].map(stopChild));
  })();
  return shutdownPromise;
}

async function closeProxy() {
  if (!proxy.listening) return;
  await new Promise((resolvePromise) => {
    proxy.close(resolvePromise);
    proxy.closeAllConnections();
  });
}

function stopChild(state) {
  if (state.exit || state.child.exitCode !== null || state.child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise) => {
    let forceTimer;
    const settle = () => {
      clearTimeout(forceTimer);
      resolvePromise();
    };
    state.child.once('exit', settle);
    state.child.kill('SIGTERM');
    forceTimer = setTimeout(() => {
      if (state.child.exitCode === null && state.child.signalCode === null) state.child.kill('SIGKILL');
      setTimeout(settle, 1_000);
    }, 5_000);
  });
}

function forceKillChildren() {
  for (const state of children) {
    if (state.child.exitCode === null && state.child.signalCode === null) state.child.kill('SIGKILL');
  }
}

function assertLocalTrialConfiguration() {
  if (process.env.APP_ENV?.trim().toLowerCase() === 'production') {
    throw new Error(
      'The customer trial launcher is local-only and refuses APP_ENV=production. Clear APP_ENV before starting it.',
    );
  }
}

function assertDistinctPorts() {
  const ports = new Set([backendPort, frontendPort, proxyPort]);
  if (ports.size !== 3) {
    throw new Error('Customer trial backend, frontend, and proxy ports must be different.');
  }
}

function assertBuildsExist() {
  const requirements = [
    {
      path: resolve(projectRoot, 'dist-backend', 'server.mjs'),
      kind: 'file',
      instruction: 'Run `npm run build:backend` to create the backend build.',
    },
    {
      path: resolve(projectRoot, 'dist', 'server', 'index.js'),
      kind: 'file',
      instruction: 'Run `npm run build` to create the frontend production build.',
    },
    {
      path: resolve(projectRoot, 'dist', 'client'),
      kind: 'directory',
      instruction: 'Run `npm run build` to create the frontend production build.',
    },
    {
      path: resolve(projectRoot, 'node_modules', 'vinext', 'dist', 'cli.js'),
      kind: 'file',
      instruction: 'Run `npm install` to install vinext.',
    },
  ];

  for (const requirement of requirements) {
    try {
      const stats = statSync(requirement.path);
      const matches = requirement.kind === 'file' ? stats.isFile() : stats.isDirectory();
      if (!matches) throw new Error('wrong path type');
    } catch {
      throw new Error(`Required ${requirement.kind} is missing: ${requirement.path}. ${requirement.instruction}`);
    }
  }
}

function resolveTrialDatabasePath(value) {
  const configured = value?.trim();
  if (configured === ':memory:') return configured;
  return configured
    ? resolve(projectRoot, configured)
    : resolve(projectRoot, 'data', 'customer-trial.sqlite');
}

function readPort(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return parsed;
}

function readPositiveInteger(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function describeExit(exit) {
  return exit.signal ? `signal ${exit.signal}` : `code ${exit.code ?? 'unknown'}`;
}
