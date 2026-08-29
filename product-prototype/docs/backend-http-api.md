# 贵客松 HTTP API contract

This is the frontend handoff contract for the Tencent Cloud Node backend. The
local default is `http://127.0.0.1:8787`; production should expose the same
paths through the server reverse proxy.

## Authentication and organization scope

All business endpoints require:

```http
Authorization: Bearer <HS256 JWT>
Content-Type: application/json
```

Required JWT claims are `sub`, `organization_id`, and numeric `exp`. Optional
claims are `email`, `name`, and `picture`; optional server checks are configured
with `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE`.

The HTTP gateway removes all client-supplied identity and organization headers
before injecting verified JWT claims. Frontend code must not send
`oai-authenticated-*`, `x-openai-*`, `x-oai-*`, `x-organization-id`, or Cloudflare
identity headers. An unknown, inactive, or unauthorized organization returns
HTTP 403.

`POST /api/auth/login` and `POST /api/auth/logout` are public
credential-session endpoints. `POST /api/auth/register` is closed by default
and is available only for an explicitly enabled single-tenant local trial:
`APP_ENV=development|local|test` plus
`ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=true`. Production always rejects public
registration. Each enabled trial must have an independent SQLite database;
registration grants the configured role in the configured default organization
and must not be presented as multi-tenant self-service signup.

Register/login set an HttpOnly `qianhai_session` cookie containing the same
signed claims. If issuer/audience checks are configured, the cookie contains
the configured `iss` and `aud` claims. A same-origin browser may use that cookie
instead of an Authorization header.

Gateway errors use:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authorization: Bearer <token> is required",
    "requestId": "..."
  }
}
```

Every response has `X-Request-Id` and `Cache-Control: no-store` where the route
returns JSON.

## Endpoint registry

| Endpoint | Methods | Contract |
| --- | --- | --- |
| `/api/health` | GET | Anonymous service/database health |
| `/api/auth/register` | POST | Trial-gated credential registration; disabled by default and always disabled in production |
| `/api/auth/login` | POST | Verify credentials and refresh the session cookie |
| `/api/auth/logout` | POST | Clear the session cookie |
| `/api/onboarding/first-login` | POST | Idempotently issue first-login onboarding |
| `/api/onboarding` | GET, PUT | Read or persist versioned onboarding config |
| `/api/onboarding/complete` | POST | Atomically complete setup and create the first growth task |
| `/api/onboarding/skip` | POST | Persist an explicit skipped state |
| `/api/knowledge` | GET, PUT | Versioned organization + enterprise scoped knowledge |
| `/api/workflow` | POST | Idempotent commercial workflow command endpoint |
| `/api/platform` | GET, POST | Platform snapshot and governance/integration commands |
| `/api/search` | GET | Explicit unsupported/seeded-data search contract |
| `/api/actions` | POST | Existing action persistence contract |
| `/api/ai` | POST | Existing AI contract; may use local fallback when no provider key exists |
| `/api/assistant` | POST | Existing assistant contract |
| `/api/content-agent` | POST | Existing content-agent contract |
| `/api/customer-actions` | POST | Existing customer command contract |
| `/api/customers` | GET | Existing customer read model |
| `/api/demo-data` | GET | Seeded demo dataset |
| `/api/revenue` | GET, POST | Existing revenue read/write model |
| `/api/tea-catalog` | GET | Existing organization-scoped tea catalog |

The stable frontend wiring surface added or hardened in this handoff is detailed
below. Existing endpoints remain automatically included in the Node bundle.

## Health

`GET /api/health` requires no authentication and returns HTTP 200 only when the
database probe succeeds:

```json
{
  "ok": true,
  "service": "guikesong-product-prototype",
  "schemaVersion": 14,
  "database": { "ok": true },
  "requestId": "...",
  "checkedAt": "2026-08-30T00:00:00.000Z"
}
```

## Credential identity

### `POST /api/auth/register`

Precondition: a non-production single-tenant trial process with
`ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=true`. Otherwise the endpoint returns
HTTP 403 `single_tenant_trial_registration_disabled` before processing account
data.

```json
{ "name": "企业管理员", "email": "owner@example.com", "password": "at-least-8-characters" }
```

HTTP 201 sets `qianhai_session=<signed JWT>; HttpOnly; SameSite=Lax` and returns:

```json
{
  "ok": true,
  "user": {
    "id": "user-...",
    "email": "owner@example.com",
    "name": "企业管理员",
    "organizationId": "org-demo-guikesong"
  },
  "requestId": "..."
}
```

Passwords are persisted only as PBKDF2-SHA256 salt/hash records. Duplicate
email returns HTTP 409 `account_exists`. The default organization and role are
operator-controlled environment values; use one database per customer trial.

### `POST /api/auth/login`

```json
{ "email": "owner@example.com", "password": "at-least-8-characters" }
```

HTTP 200 returns the same public user object and refreshes the HttpOnly cookie.
Invalid credentials return HTTP 401 `invalid_credentials` without revealing
whether the email exists.

### `POST /api/auth/logout`

No body. HTTP 200 sets the session cookie to an empty value with `Max-Age=0`.
The server does not currently maintain a token-revocation list; logout clears
the browser credential.

## Onboarding

### `POST /api/onboarding/first-login`

No body. First response:

```json
{
  "ok": true,
  "shouldStartOnboarding": true,
  "issuedAt": "2026-08-30T00:00:00.000Z",
  "onboarding": {
    "organizationId": "org-demo-guikesong",
    "enterpriseId": "ent-demo-matcha",
    "userId": "user-...",
    "status": "issued",
    "config": {},
    "version": 1,
    "firstGrowthTaskId": null
  },
  "requestId": "..."
}
```

Repeating the request preserves `issuedAt` and returns
`shouldStartOnboarding:false`.

### `GET /api/onboarding`

Returns the persisted organization/user/enterprise state. Before issuance its
status is `not_started` and version is `0`.

### `PUT /api/onboarding`

```json
{
  "version": 1,
  "config": {
    "company": "贵州某企业",
    "industry": "食品原料"
  }
}
```

Response is HTTP 200 with `status:"in_progress"`, merged `config`, and an
incremented version. A stale version returns HTTP 409 `version_conflict`.

### `POST /api/onboarding/complete`

```json
{
  "version": 2,
  "config": {
    "company": "贵州某企业",
    "industry": "食品原料",
    "product": "饮品级抹茶粉",
    "market": "马来西亚",
    "autonomy": "审批后执行"
  }
}
```

First completion is HTTP 201:

```json
{
  "ok": true,
  "replayed": false,
  "onboarding": {
    "status": "completed",
    "version": 3,
    "firstGrowthTaskId": "task-onboarding-..."
  },
  "task": {
    "id": "task-onboarding-...",
    "enterpriseId": "ent-demo-matcha",
    "name": "饮品级抹茶粉 · 马来西亚市场获客任务",
    "targetMarket": "马来西亚",
    "autonomyMode": "approval_required",
    "status": "draft",
    "startsOn": "2026-08-30",
    "endsOn": "2026-09-29"
  },
  "requestId": "..."
}
```

Repeating completion is HTTP 200 with `replayed:true` and the same task ID.

### `POST /api/onboarding/skip`

No body. Returns HTTP 200 with `status:"skipped"`. Completed onboarding cannot
be skipped and returns HTTP 409.

Onboarding state transitions:

```text
not_started -> issued -> in_progress -> completed
       |          |          |
       +----------+----------+-> skipped

completed -> completed (idempotent replay only)
```

## Enterprise knowledge

The storage key is `(organization_id, enterprise_id)`. The enterprise ID must
be the enterprise linked to the authenticated organization.

### `GET /api/knowledge?enterpriseId=ent-demo-matcha`

```json
{
  "state": null,
  "version": 0,
  "organizationId": "org-demo-guikesong",
  "enterpriseId": "ent-demo-matcha"
}
```

### `PUT /api/knowledge`

```json
{
  "enterpriseId": "ent-demo-matcha",
  "version": 0,
  "state": { "positioning": "premium B2B matcha" }
}
```

```json
{
  "ok": true,
  "version": 1,
  "updatedAt": "2026-08-30T00:00:00.000Z",
  "updatedBy": "user-...",
  "organizationId": "org-demo-guikesong",
  "enterpriseId": "ent-demo-matcha",
  "auditRecorded": true
}
```

Stale versions return HTTP 409. A different enterprise ID returns HTTP 403
`enterprise_scope_forbidden`. State JSON is limited to 250 KB.

## Commercial workflow

All commands use `POST /api/workflow`:

```json
{
  "action": "create_task",
  "runId": "run-frontend-generated-id",
  "idempotencyKey": "optional-stable-command-key",
  "payload": {
    "name": "Malaysia lead generation",
    "targetMarket": "MY",
    "productIds": ["prd-m02"],
    "budgetCny": 12000
  }
}
```

`Idempotency-Key` may be sent as a header instead. If omitted, the key is
`<runId>:<action>`. Repeating a successful key returns HTTP 200 with
`replayed:true` and the original resource.

| Action | Required relationship | Success |
| --- | --- | --- |
| `create_task` | Starts a run-scoped task | 201 `{task:{id,status:"draft"}}` |
| `update_task` | Existing task in the JWT organization | 200 |
| `create_content` | `payload.taskId` | 201 |
| `schedule_content` | `taskId` + content owned by task | 201 |
| `create_campaign` | `taskId` | 201 |
| `create_customer` | Organization run | 201 |
| `create_inquiry` | Customer and optional campaign/content | 201 |
| `create_quote` | Task + customer + quote items | 201 draft quote |
| `request_quote_approval` | Draft quote | 201 pending approval |
| `decide_approval` | Pending approval | 200 approved/rejected |
| `create_order` | Approved quote | 201 won/lost order |
| `record_attribution` | Run resources | 201 |
| `get_run` | `runId` | 200 traceable counts + chain |
| `cleanup_run` | `runId` | 200; deletes only that run's resources |

Commercial state sequence exercised by E2E:

```text
task:draft
  -> content:draft -> schedule:scheduled -> campaign:draft
  -> customer:new_inquiry -> inquiry:persisted
  -> quote:draft -> approval:pending -> approval:approved
  -> quote:approved -> order:won -> quote:accepted
  -> attribution:recorded
```

The workflow run and all idempotency, audit, history, and outbox records are
scoped by the authenticated organization.

## Integration and sync truthfulness

Commands use `POST /api/platform`.

`GET /api/platform` returns the authenticated organization descriptor plus
`integrations`, `dataSources`, `syncRuns`, `metrics`, and `health`. It never
counts `unsupported` or `queued` runs as successful synchronization.

Missing configuration:

```json
{
  "action": "integration.test",
  "payload": { "id": "crm", "name": "CRM", "integrationType": "custom" }
}
```

HTTP 409:

```json
{
  "ok": false,
  "id": "crm",
  "status": "needs_configuration",
  "error": "integration_needs_configuration",
  "missing": ["endpoint_url", "secret_ref"],
  "testAttempted": false
}
```

If a real HTTPS request is attempted but fails, the response is HTTP 502 with
`status:"failed"`, `error:"integration_connection_failed"`, and
`testAttempted:true`. Only a real 2xx response becomes `connected`.

Sync request:

```json
{ "action": "sync.run", "payload": { "integrationId": "crm" } }
```

HTTP 501:

```json
{
  "ok": false,
  "status": "unsupported",
  "error": "connector_worker_not_implemented",
  "runId": "sync-...",
  "integrationId": "crm",
  "retryable": false
}
```

The run is persisted as `unsupported` and completed. No fake `queued` state is
created. Integration states are:

```text
needs_configuration -> connected   (real remote 2xx only)
needs_configuration -> failed      (real attempt failed)
sync request         -> unsupported (connector executor absent)
```

## Search truthfulness

`GET /api/search?q=matcha` always returns HTTP 501 until a server index or
remote provider is implemented:

```json
{
  "ok": false,
  "supported": false,
  "status": "unsupported",
  "mode": "seeded_data",
  "error": "search_not_implemented",
  "query": "matcha",
  "results": [],
  "networkAttempted": false,
  "capabilities": {
    "serverIndex": false,
    "remoteSearch": false,
    "seededDataOnly": true
  }
}
```

Frontend code may label already-loaded records as seeded demo data, but must not
display this response as a successful network search.
