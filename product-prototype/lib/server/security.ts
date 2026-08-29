import { ApiError } from './errors';

const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'access_token',
  'api_key',
  'apikey',
  'client_secret',
  'password',
  'refresh_token',
  'secret',
  'secret_value',
  'token',
]);

export function assertCredentialMetadataSafe(value: unknown): void {
  inspect(value, '$', new WeakSet<object>());
}

export function assertSecretBindingName(value: string): string {
  if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(value)) {
    throw new ApiError(
      422,
      'validation_error',
      'secretBinding must be an environment binding name such as CRM_OAUTH_TOKEN',
      { field: 'secretBinding' },
    );
  }
  return value;
}

function inspect(value: unknown, path: string, seen: WeakSet<object>): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll('-', '_');
    if (FORBIDDEN_CREDENTIAL_KEYS.has(normalized)) {
      throw new ApiError(422, 'validation_error', 'Credential metadata must not contain plaintext secrets', {
        field: `${path}.${key}`,
      });
    }
    inspect(nestedValue, `${path}.${key}`, seen);
  }
}
