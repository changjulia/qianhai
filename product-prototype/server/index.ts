import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { authenticateHeaders, assertAuthConfiguration, GatewayError } from './auth-gateway';
import { installRuntimeBindings } from './cloudflare-workers-shim';
import { applyMigrations, prepareDatabaseDirectory, resolveDatabasePath } from './migrations';
import { openNodeD1 } from './node-d1';
import { allowedMethods, createRoutes, matchRoute, routeHandler, routeSummary } from './routes';

const host = process.env.HOST?.trim() || '127.0.0.1';
const port = parsePort(process.env.PORT);
const databasePath = resolveDatabasePath(process.env.DATABASE_PATH);
const migrationsPath = process.env.MIGRATIONS_PATH?.trim() || 'migrations';
const maxBodyBytes = parsePositiveInteger(process.env.MAX_BODY_BYTES, 10 * 1024 * 1024);

assertAuthConfiguration();
prepareDatabaseDirectory(databasePath);
const database = openNodeD1(databasePath);
const appliedMigrations = applyMigrations(database, migrationsPath);
installRuntimeBindings({ DB: database as unknown as D1Database });
const routes = createRoutes();

const server = createServer(async (incoming, outgoing) => {
  const requestId = incoming.headers['x-request-id']?.toString().slice(0, 200) || crypto.randomUUID();
  try {
    await dispatch(incoming, outgoing, requestId);
  } catch (error) {
    const gatewayError = error instanceof GatewayError ? error : null;
    if (!gatewayError) console.error(`[${requestId}] Unhandled HTTP error`, error);
    sendJson(
      outgoing,
      gatewayError?.status ?? 500,
      {
        error: {
          code: gatewayError?.code ?? 'internal_error',
          message: gatewayError?.message ?? 'An unexpected server error occurred',
          requestId,
        },
      },
      requestId,
      incoming,
    );
  }
});

server.requestTimeout = parsePositiveInteger(process.env.REQUEST_TIMEOUT_MS, 30_000);
server.headersTimeout = parsePositiveInteger(process.env.HEADERS_TIMEOUT_MS, 15_000);
server.keepAliveTimeout = parsePositiveInteger(process.env.KEEP_ALIVE_TIMEOUT_MS, 5_000);

server.listen(port, host, () => {
  const displayDatabase = databasePath === ':memory:' ? databasePath : resolve(databasePath);
  console.log(
    JSON.stringify({
      event: 'backend.started',
      url: `http://${host}:${port}`,
      databasePath: displayDatabase,
      appliedMigrations,
      routes: routeSummary(routes),
    }),
  );
});

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(() => {
      database.close();
      process.exitCode = 0;
    });
    setTimeout(() => {
      process.exitCode = 1;
      server.closeAllConnections();
    }, 10_000).unref();
  });
}

async function dispatch(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  requestId: string,
): Promise<void> {
  const requestUrl = new URL(incoming.url || '/', requestOrigin(incoming));
  const match = matchRoute(routes, requestUrl.pathname);
  if (!match) {
    sendJson(
      outgoing,
      404,
      { error: { code: 'not_found', message: 'API route not found', requestId } },
      requestId,
      incoming,
    );
    return;
  }

  const cors = evaluateCors(incoming, requestUrl);
  if (!cors.allowed) {
    sendJson(
      outgoing,
      403,
      { error: { code: 'cors_origin_forbidden', message: 'Cross-origin request is not allowed', requestId } },
      requestId,
      incoming,
    );
    return;
  }

  if ((incoming.method || 'GET').toUpperCase() === 'OPTIONS') {
    const requestedMethod = incoming.headers['access-control-request-method']?.toString().toUpperCase();
    const methods = allowedMethods(match.route);
    if (requestedMethod && !methods.includes(requestedMethod)) {
      sendJson(
        outgoing,
        405,
        { error: { code: 'method_not_allowed', message: 'Requested method is not allowed', requestId } },
        requestId,
        incoming,
        { Allow: methods.join(', ') },
      );
      return;
    }
    outgoing.statusCode = 204;
    outgoing.setHeader('Allow', methods.join(', '));
    outgoing.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Request-Id, OAI-Authenticated-User-Id, OAI-Authenticated-User-Email, OAI-Authenticated-User-Name, OAI-Authenticated-User-Organization-Id, X-Organization-Id',
    );
    outgoing.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    outgoing.setHeader('Access-Control-Max-Age', '600');
    applyCorsHeaders(outgoing, cors.origin);
    outgoing.setHeader('X-Request-Id', requestId);
    outgoing.end();
    return;
  }

  const method = (incoming.method || 'GET').toUpperCase();
  const handler = routeHandler(match.route, method);
  if (!handler) {
    const methods = allowedMethods(match.route);
    sendJson(
      outgoing,
      405,
      { error: { code: 'method_not_allowed', message: 'HTTP method is not allowed', requestId } },
      requestId,
      incoming,
      { Allow: methods.join(', ') },
    );
    return;
  }

  const incomingHeaders = toWebHeaders(incoming);
  incomingHeaders.set('x-request-id', requestId);
  const authenticatedHeaders = authenticateHeaders(incomingHeaders, requestUrl.pathname);
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(incoming, maxBodyBytes);
  const request = new Request(requestUrl, {
    method,
    headers: authenticatedHeaders,
    ...(body && body.byteLength > 0 ? { body: Uint8Array.from(body).buffer } : {}),
  });
  const response = await handler(request, { params: Promise.resolve(match.params) });
  if (!(response instanceof Response)) {
    throw new TypeError(`Route ${match.route.pathname} did not return a Response`);
  }
  await sendWebResponse(outgoing, response, requestId, method === 'HEAD', cors.origin);
}

function requestOrigin(request: IncomingMessage): string {
  const hostHeader = request.headers.host || `${host}:${port}`;
  const protocol = request.headers['x-forwarded-proto']?.toString().split(',')[0].trim() || 'http';
  return `${protocol === 'https' ? 'https' : 'http'}://${hostHeader}`;
}

function toWebHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}

async function readBody(request: IncomingMessage, limit: number): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > limit) {
      throw new GatewayError(413, 'payload_too_large', `Request body exceeds ${limit} bytes`);
    }
    chunks.push(buffer);
  }
  return chunks.length ? Buffer.concat(chunks, total) : undefined;
}

async function sendWebResponse(
  outgoing: ServerResponse,
  response: Response,
  requestId: string,
  omitBody: boolean,
  corsOrigin?: string,
): Promise<void> {
  outgoing.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name.toLowerCase() === 'set-cookie') continue;
    outgoing.setHeader(name, value);
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length) outgoing.setHeader('Set-Cookie', cookies);
  outgoing.setHeader('X-Request-Id', response.headers.get('x-request-id') || requestId);
  outgoing.setHeader('X-Content-Type-Options', 'nosniff');
  applyCorsHeaders(outgoing, corsOrigin);
  if (omitBody || response.body === null) {
    outgoing.end();
    return;
  }
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

function sendJson(
  outgoing: ServerResponse,
  status: number,
  body: unknown,
  requestId: string,
  incoming: IncomingMessage,
  headers: Record<string, string> = {},
): void {
  outgoing.statusCode = status;
  outgoing.setHeader('Content-Type', 'application/json; charset=utf-8');
  outgoing.setHeader('Cache-Control', 'no-store');
  outgoing.setHeader('X-Content-Type-Options', 'nosniff');
  outgoing.setHeader('X-Request-Id', requestId);
  for (const [name, value] of Object.entries(headers)) outgoing.setHeader(name, value);
  const origin = safeAllowedCorsOrigin(incoming);
  applyCorsHeaders(outgoing, origin);
  outgoing.end(JSON.stringify(body));
}

function evaluateCors(
  incoming: IncomingMessage,
  requestUrl: URL,
): { allowed: boolean; origin?: string } {
  const origin = incoming.headers.origin?.toString().trim();
  if (!origin) return { allowed: true };
  if (origin === requestUrl.origin) return { allowed: true };
  const allowedOrigins = configuredCorsOrigins();
  if (allowedOrigins.has('*') || allowedOrigins.has(origin)) return { allowed: true, origin };
  return { allowed: false };
}

function safeAllowedCorsOrigin(incoming: IncomingMessage): string | undefined {
  const origin = incoming.headers.origin?.toString().trim();
  if (!origin) return undefined;
  const allowedOrigins = configuredCorsOrigins();
  return allowedOrigins.has('*') || allowedOrigins.has(origin) ? origin : undefined;
}

function configuredCorsOrigins(): Set<string> {
  return new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function applyCorsHeaders(response: ServerResponse, origin?: string): void {
  if (!origin) return;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 8787);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return parsed;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
