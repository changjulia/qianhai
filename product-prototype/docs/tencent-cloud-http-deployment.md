# Tencent Cloud Node HTTP deployment

The backend is a standard Node.js HTTP service with SQLite persistence. It does
not deploy to Cloudflare Workers and does not require Wrangler or D1.

## Build artifact

```powershell
npm ci
npm run build:backend
```

Deploy these runtime inputs together:

- `dist-backend/`
- `migrations/`
- `package.json` and production `node_modules/`

The process must start with the project release directory as its working
directory unless `MIGRATIONS_PATH` is absolute.

## Required environment

```text
APP_ENV=production
HOST=127.0.0.1
PORT=8787
DATABASE_PATH=/srv/qianhai/shared/qianhai.sqlite
MIGRATIONS_PATH=/srv/qianhai/current/migrations
AUTH_JWT_SECRET=<strong secret from Tencent Secret Manager>
ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=false
DEFAULT_ORGANIZATION_ID=org-demo-guikesong
DEFAULT_NEW_USER_ROLE_ID=role-owner
CORS_ALLOWED_ORIGINS=
```

Set `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` when the identity issuer provides
stable values. Never enable `ALLOW_TEST_AUTH_HEADERS` or `ALLOW_DEMO_ACTOR` in
production.

Production public registration is disabled in code and must remain disabled.
`ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=true` is accepted only by a
development/local/test process. For tomorrow's controlled trial, run a separate
non-production process and a separate SQLite database for each customer; never
point trial registration at `/srv/qianhai/shared/qianhai.sqlite` or another
shared/real-data database. The registered account receives
`DEFAULT_NEW_USER_ROLE_ID` in `DEFAULT_ORGANIZATION_ID`, so the trial database
must contain only data that customer is authorized to see and change.

Before opening any future registration flow to the public internet, replace the
trial gate with invitation or tenant provisioning and add Nginx/API rate limits,
abuse monitoring, email ownership verification, password reset, and a session
revocation/rotation policy. The current handoff verifies account persistence
and frontend session wiring only for a controlled single-customer trial.

## Process and reverse proxy

Run `node dist-backend/server.mjs` under systemd or the chosen process manager.
Keep the Node port bound to loopback and proxy `/api/` from Nginx to
`http://127.0.0.1:8787`. This preserves an ordinary HTTP API contract; the
public listener should still terminate TLS when a domain is available.

The SQLite file lives outside versioned release directories. Back up the main
database plus its WAL/SHM files with a SQLite-aware snapshot process. Use one
application process per database file; this design scales vertically and is
not a multi-node database topology.

## Release checks

```powershell
npm run test:backend:http
npm run lint
npx tsc -p tsconfig.check.json --pretty false
```

After starting the release:

```text
GET http://127.0.0.1:8787/api/health
```

The response must be HTTP 200 with `ok:true`, `database.ok:true`, and the
expected schema version. A release is not healthy merely because the process is
listening.
