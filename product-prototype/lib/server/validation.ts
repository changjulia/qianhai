import { ApiError } from './errors';

export type UnknownRecord = Record<string, unknown>;

export async function readJsonBody(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? 256_000;
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, 'payload_too_large', `Request body exceeds ${maxBytes} bytes`);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiError(413, 'payload_too_large', `Request body exceeds ${maxBytes} bytes`);
  }
  if (!body.trim()) throw new ApiError(400, 'bad_request', 'Request body is required');

  try {
    return JSON.parse(body) as unknown;
  } catch (cause) {
    throw new ApiError(400, 'bad_request', 'Request body must be valid JSON', undefined, { cause });
  }
}

export function objectValue(value: unknown, field = 'body'): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(field, 'must be an object');
  }
  return value as UnknownRecord;
}

export function stringValue(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; trim?: boolean } = {},
): string {
  if (typeof value !== 'string') throw validationError(field, 'must be a string');
  const normalized = options.trim === false ? value : value.trim();
  if (normalized.length < (options.min ?? 1)) throw validationError(field, 'is required');
  if (normalized.length > (options.max ?? 10_000)) {
    throw validationError(field, `must be at most ${options.max ?? 10_000} characters`);
  }
  return normalized;
}

export function optionalString(
  value: unknown,
  field: string,
  options: { max?: number; trim?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return stringValue(value, field, { ...options, min: 0 });
}

export function numberValue(
  value: unknown,
  field: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw validationError(field, 'must be a finite number');
  if (options.integer && !Number.isInteger(value)) throw validationError(field, 'must be an integer');
  if (options.min !== undefined && value < options.min) throw validationError(field, `must be at least ${options.min}`);
  if (options.max !== undefined && value > options.max) throw validationError(field, `must be at most ${options.max}`);
  return value;
}

export function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw validationError(field, 'must be a boolean');
  return value;
}

export function enumValue<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw validationError(field, `must be one of: ${allowed.join(', ')}`);
  }
  return value as T[number];
}

export function stringArray(
  value: unknown,
  field: string,
  options: { maxItems?: number; itemMax?: number } = {},
): string[] {
  if (!Array.isArray(value)) throw validationError(field, 'must be an array');
  const maxItems = options.maxItems ?? 100;
  if (value.length > maxItems) throw validationError(field, `must contain at most ${maxItems} items`);
  return value.map((item, index) =>
    stringValue(item, `${field}[${index}]`, { max: options.itemMax ?? 500 }),
  );
}

export function validationError(field: string, reason: string): ApiError {
  return new ApiError(422, 'validation_error', `Invalid ${field}: ${reason}`, { field, reason });
}
