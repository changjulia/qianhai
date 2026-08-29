# Tencent Cloud Node HTTP backend

This backend-only bundle reuses every `app/api/**/route.ts` handler. It runs on
standard Node.js HTTP and `node:sqlite`; it does not require Cloudflare Workers,
Wrangler, or D1.

## Build and start

Requires Node.js 22.13 or newer (Node 24 LTS is recommended).

```powershell
npx vite build --config vite.backend.config.ts
$env:AUTH_JWT_SECRET = '<a strong shared HS256 secret>'
$env:HOST = '0.0.0.0'
$env:PORT = '8787'
$env:DATABASE_PATH = 'data/qianhai.sqlite'
node dist-backend/server.mjs
```

The server applies each `migrations/*.sql` file once and records it in
`_node_schema_migrations`. `DATABASE_PATH=:memory:` is useful for smoke tests.

For local or test-only calls without a JWT:

```powershell
$env:APP_ENV = 'local'
$env:ALLOW_TEST_AUTH_HEADERS = 'true'
node dist-backend/server.mjs
```

Then send both `OAI-Authenticated-User-Id` and
`OAI-Authenticated-User-Organization-Id`. These headers are never trusted in
production. In production, all routes except `/api/health` require an HS256 JWT
with `sub`, `organization_id`, and numeric `exp` claims. Optional
`AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` values enforce `iss` and `aud`.

`CORS_ALLOWED_ORIGINS` is a comma-separated exact allowlist and defaults to no
cross-origin access. A same-origin Nginx reverse proxy needs no CORS setting.

