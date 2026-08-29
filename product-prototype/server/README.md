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
$env:DEFAULT_ORGANIZATION_ID = 'org-demo-guikesong'
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

`/api/auth/login` and `/api/auth/logout` are public credential-session
endpoints. `/api/auth/register` is closed by default. It is enabled only when
`APP_ENV` is `development`, `local`, or `test` and
`ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=true`. Production always rejects public
registration even if the flag is accidentally set. This mode is only for one
customer with an independent SQLite database; it grants the configured default
role in the configured default organization and is not multi-tenant signup.

Register/login use the same `AUTH_JWT_SECRET` to sign an HttpOnly cookie and
require a secret of at least 32 characters. When `AUTH_JWT_ISSUER` or
`AUTH_JWT_AUDIENCE` is configured, credential cookies carry those claims and
are checked by the same Node gateway policy as Bearer JWTs. All other business
routes accept either that cookie or a Bearer JWT.

`CORS_ALLOWED_ORIGINS` is a comma-separated exact allowlist and defaults to no
cross-origin access. A same-origin Nginx reverse proxy needs no CORS setting.
