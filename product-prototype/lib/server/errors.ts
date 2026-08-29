export type ApiErrorCode =
  | 'bad_request'
  | 'conflict'
  | 'database_unavailable'
  | 'forbidden'
  | 'internal_error'
  | 'not_found'
  | 'payload_too_large'
  | 'unauthorized'
  | 'validation_error';

export class ApiError extends Error {
  readonly code: ApiErrorCode | (string & {});
  readonly status: number;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ApiErrorCode | (string & {}),
    message: string,
    details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return Response.json(data, { ...init, headers });
}

export function errorResponse(error: unknown, requestId?: string): Response {
  const apiError = normalizeError(error);
  const body: ErrorEnvelope = {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
      ...(requestId ? { requestId } : {}),
    },
  };
  return jsonResponse(body, { status: apiError.status });
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(500, 'internal_error', 'An unexpected server error occurred', undefined, {
    cause: error,
  });
}

export async function withApiErrors(
  handler: (requestId: string) => Promise<Response>,
  requestId = crypto.randomUUID(),
): Promise<Response> {
  try {
    const response = await handler(requestId);
    response.headers.set('X-Request-Id', requestId);
    return response;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error(`[${requestId}] API handler failed`, error);
    }
    const response = errorResponse(error, requestId);
    response.headers.set('X-Request-Id', requestId);
    return response;
  }
}
