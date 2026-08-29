export type WorkflowAction =
  | 'create_task'
  | 'update_task'
  | 'create_content'
  | 'schedule_content'
  | 'create_campaign'
  | 'create_customer'
  | 'create_inquiry'
  | 'create_quote'
  | 'request_quote_approval'
  | 'decide_approval'
  | 'create_order'
  | 'record_attribution'
  | 'get_run'
  | 'cleanup_run';

export interface WorkflowRequestOptions {
  runId: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface WorkflowRunSnapshot {
  ok: true;
  run: Record<string, unknown>;
  counts: Record<string, number>;
  chain: Record<string, unknown>;
  foreignKeyViolations: number;
  replayed?: boolean;
}

export type OnboardingStatus =
  | 'not_started'
  | 'issued'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export interface OnboardingConfig {
  company: string;
  industry: string;
  product: string;
  market: string;
  autonomy: string;
}

export interface OnboardingState {
  organizationId: string;
  enterpriseId: string;
  userId: string;
  status: OnboardingStatus;
  config: Partial<OnboardingConfig>;
  version: number;
  firstGrowthTaskId: string | null;
  issuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  updatedAt: string | null;
}

export interface GrowthTaskSummary {
  id: string;
  enterpriseId: string;
  name: string;
  targetMarket: string;
  autonomyMode: string;
  status: string;
  startsOn: string;
  endsOn: string;
}

export interface OnboardingResponse {
  ok: true;
  onboarding: OnboardingState;
  requestId?: string;
}

export interface FirstLoginOnboardingResponse extends OnboardingResponse {
  shouldStartOnboarding: boolean;
  issuedAt: string;
}

export interface CompleteOnboardingResponse extends OnboardingResponse {
  replayed: boolean;
  task: GrowthTaskSummary;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

export interface AuthenticationResponse {
  ok: true;
  user: AuthenticatedUser;
  requestId?: string;
}

export interface BusinessSearchResult {
  id: string;
  title: string;
  type?: string;
  snippet?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  updatedAt?: string;
  seeded?: boolean;
  [key: string]: unknown;
}

export interface BusinessSearchResponse {
  ok: boolean;
  supported: boolean;
  status: 'ready' | 'unsupported' | (string & {});
  mode: 'seeded_data' | 'server_index' | 'remote_search' | (string & {});
  query: string;
  results: BusinessSearchResult[];
  networkAttempted: boolean;
  capabilities: {
    serverIndex: boolean;
    remoteSearch: boolean;
    seededDataOnly: boolean;
  };
  message: string;
  error?: string;
  requestId?: string;
}

interface ApiErrorEnvelope {
  error?: string | {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
  message?: string;
  requestId?: string;
}

export class BusinessApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;
  readonly responseBody?: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
    responseBody?: unknown;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = 'BusinessApiError';
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
    this.responseBody = input.responseBody;
  }

  get isUnauthorized() {
    return this.status === 401 || this.code === 'unauthorized' || this.code === 'invalid_credentials';
  }
}

export async function workflowRequest<T>(
  action: WorkflowAction,
  options: WorkflowRequestOptions,
): Promise<T> {
  const payload = options.payload ?? {};
  const idempotencyKey = options.idempotencyKey
    ?? await defaultIdempotencyKey(options.runId, action, payload);
  return requestJson<T>('/api/workflow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      action,
      runId: options.runId,
      idempotencyKey,
      payload,
    }),
    signal: options.signal,
  });
}

export function getWorkflowRun(runId: string, signal?: AbortSignal) {
  return workflowRequest<WorkflowRunSnapshot>('get_run', { runId, signal });
}

export function getOnboarding(signal?: AbortSignal) {
  return requestJson<OnboardingResponse>('/api/onboarding', {
    method: 'GET',
    cache: 'no-store',
    signal,
  });
}

export function startOnboarding(signal?: AbortSignal) {
  return requestJson<FirstLoginOnboardingResponse>('/api/onboarding/first-login', {
    method: 'POST',
    signal,
  });
}

export const claimFirstLoginOnboarding = startOnboarding;

export function saveOnboardingConfig(
  config: Partial<OnboardingConfig>,
  version?: number,
  signal?: AbortSignal,
) {
  return requestJson<OnboardingResponse>('/api/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, ...(version === undefined ? {} : { version }) }),
    signal,
  });
}

export function completeOnboarding(
  config: OnboardingConfig,
  version?: number,
  signal?: AbortSignal,
) {
  return requestJson<CompleteOnboardingResponse>('/api/onboarding/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, ...(version === undefined ? {} : { version }) }),
    signal,
  });
}

export function skipOnboarding(signal?: AbortSignal) {
  return requestJson<OnboardingResponse>('/api/onboarding/skip', {
    method: 'POST',
    signal,
  });
}

export function registerWithCredentials(
  input: { name: string; email: string; password: string },
  signal?: AbortSignal,
) {
  return requestJson<AuthenticationResponse>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
}

export function loginWithCredentials(
  input: { email: string; password: string },
  signal?: AbortSignal,
) {
  return requestJson<AuthenticationResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
}

export function logout(signal?: AbortSignal) {
  return requestJson<{ ok: true; requestId?: string }>('/api/auth/logout', {
    method: 'POST',
    signal,
  });
}

export async function searchBusiness(
  query: string,
  options: { scope?: string; cursor?: string; signal?: AbortSignal } = {},
): Promise<BusinessSearchResponse> {
  const search = new URLSearchParams({ q: query.trim() });
  if (options.scope) search.set('scope', options.scope);
  if (options.cursor) search.set('cursor', options.cursor);
  const response = await fetch(`/api/search?${search.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  }).catch((cause: unknown) => {
    throw networkError(cause);
  });
  const body = await readResponseBody(response);
  if (response.status === 501 && isSearchResponse(body) && body.status === 'unsupported') {
    return withResponseRequestId(body, response);
  }
  if (!response.ok) throw responseError(response, body);
  if (!isSearchResponse(body)) {
    throw new BusinessApiError({
      status: response.status,
      code: 'invalid_response',
      message: '搜索服务返回了无法识别的数据。',
      requestId: response.headers.get('X-Request-Id') ?? undefined,
      responseBody: body,
    });
  }
  return withResponseRequestId(body, response);
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: init.credentials ?? 'same-origin',
      cache: init.cache ?? 'no-store',
    });
  } catch (cause) {
    throw networkError(cause);
  }
  const body = await readResponseBody(response);
  if (!response.ok) throw responseError(response, body);
  return body as T;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function responseError(response: Response, body: unknown): BusinessApiError {
  const envelope = isRecord(body) ? body as ApiErrorEnvelope : {};
  const nested = isRecord(envelope.error) ? envelope.error : undefined;
  const code = nested?.code
    ?? (typeof envelope.error === 'string' ? envelope.error : undefined)
    ?? `http_${response.status}`;
  const message = nested?.message
    ?? (typeof envelope.message === 'string' ? envelope.message : undefined)
    ?? `请求失败（HTTP ${response.status}）`;
  const requestId = nested?.requestId
    ?? envelope.requestId
    ?? response.headers.get('X-Request-Id')
    ?? undefined;
  return new BusinessApiError({
    status: response.status,
    code,
    message,
    requestId,
    details: nested?.details,
    responseBody: body,
  });
}

function networkError(cause: unknown): BusinessApiError {
  if (cause instanceof BusinessApiError) return cause;
  return new BusinessApiError({
    status: 0,
    code: 'network_error',
    message: '无法连接业务服务，请检查网络后重试。',
    cause,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSearchResponse(value: unknown): value is BusinessSearchResponse {
  if (!isRecord(value)) return false;
  return typeof value.supported === 'boolean'
    && typeof value.status === 'string'
    && typeof value.mode === 'string'
    && typeof value.query === 'string'
    && Array.isArray(value.results)
    && typeof value.networkAttempted === 'boolean'
    && isRecord(value.capabilities)
    && typeof value.message === 'string';
}

function withResponseRequestId<T extends { requestId?: string }>(body: T, response: Response): T {
  const requestId = body.requestId ?? response.headers.get('X-Request-Id') ?? undefined;
  return requestId ? { ...body, requestId } : body;
}

async function defaultIdempotencyKey(
  runId: string,
  action: WorkflowAction,
  payload: Record<string, unknown>,
): Promise<string> {
  const canonical = stableStringify(payload);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest).slice(0, 12), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${runId}:${action}:${hash}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
