const DEFAULT_SENSITIVE_KEYS = new Set([
  'access_token',
  'refreshtoken',
  'refresh_token',
  'api_key',
  'apikey',
  'authorization',
  'client_secret',
  'cookie',
  'password',
  'secret',
  'secret_value',
  'set-cookie',
  'token',
]);

export class JsonFieldError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'JsonFieldError';
    this.field = field;
  }
}

export function parseJson<T>(value: unknown, fallback: T, field?: string): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch (cause) {
    throw new JsonFieldError(`Invalid JSON${field ? ` in ${field}` : ''}`, field, { cause });
  }
}

export function parseJsonOr<T>(value: unknown, fallback: T): T {
  try {
    return parseJson(value, fallback);
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown, fallback = '{}'): string {
  if (value === undefined) return fallback;
  try {
    return JSON.stringify(value);
  } catch (cause) {
    throw new JsonFieldError('Value is not JSON serializable', undefined, { cause });
  }
}

export function deserializeJsonColumns<T extends Record<string, unknown>>(
  row: T,
  columns: readonly string[],
): T {
  const result: Record<string, unknown> = { ...row };
  for (const column of columns) {
    if (column in result) result[column] = parseJsonOr(result[column], null);
  }
  return result as T;
}

export function serializeJsonColumns<T extends Record<string, unknown>>(
  input: T,
  columns: readonly string[],
): T {
  const result: Record<string, unknown> = { ...input };
  for (const column of columns) {
    if (column in result && typeof result[column] !== 'string') {
      result[column] = stringifyJson(result[column]);
    }
  }
  return result as T;
}

export function redactSensitive(value: unknown, additionalKeys: readonly string[] = []): unknown {
  const sensitiveKeys = new Set([...DEFAULT_SENSITIVE_KEYS, ...additionalKeys.map(normalizeKey)]);
  return redact(value, sensitiveKeys, new WeakSet<object>());
}

function redact(value: unknown, sensitiveKeys: Set<string>, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return value.map((item) => redact(item, sensitiveKeys, seen));
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeys.has(normalizeKey(key)) ? '[REDACTED]' : redact(nestedValue, sensitiveKeys, seen),
    ]),
  );
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replaceAll('-', '_');
}
