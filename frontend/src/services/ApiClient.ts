'use client';

/**
 * ApiClient — centralised HTTP client for the FORGE backend.
 *
 * Every outbound REST call goes through this single file so that timeout,
 * retry, error-categorisation, and deduplication logic lives in ONE place.
 *
 * IMPORTANT: The core `safeFetch` function NEVER throws. All public methods
 * return SafeResult. This prevents Next.js dev overlay from intercepting
 * network errors as unhandled rejections.
 */

// ── Configuration ──────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const REQUEST_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

// ── Auth token injection ──────────────────────────────────────────────────────

/** Returns the stored JWT for authenticated requests */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('forge_jwt');
}

/** Returns the active tenant slug for tenant-scoped API paths */
function getActiveTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('forge_active_tenant');
    if (!raw) return null;
    return JSON.parse(raw).slug || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the API path, prefixing with /t/{slug} for tenant-scoped routes.
 * Auth routes (/auth/*) are never tenant-scoped.
 */
function resolveApiPath(path: string): string {
  if (path.startsWith('/auth')) return path;
  const slug = getActiveTenantSlug();
  if (slug) return `/t/${slug}${path}`;
  return path;
}

// ── Error hierarchy ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 0,
    public readonly code: string = 'UNKNOWN',
    public readonly retryable: boolean = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED', false);
    this.name = 'UnauthorizedError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed') {
    super(message, 0, 'NETWORK', false);
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND', false);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION', false, details);
    this.name = 'ValidationError';
  }
}

export class ServerError extends ApiError {
  constructor(message = 'Server error') {
    super(message, 500, 'SERVER', true);
    this.name = 'ServerError';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyStatus(status: number, body?: string): ApiError {
  const msg = body || `HTTP ${status}`;
  if (status === 400) return new ValidationError(msg);
  if (status === 401) return new UnauthorizedError(msg);
  if (status === 403) return new ApiError(msg, 403, 'FORBIDDEN', false);
  if (status === 404) return new NotFoundError(msg);
  if (status === 409) return new ApiError(msg, 409, 'CONFLICT', false);
  if (status >= 500) return new ServerError(msg);
  return new ApiError(msg, status, 'CLIENT', false);
}

// ── SafeResult type ──────────────────────────────────────────────────────────

export type SafeResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// ── Request options ──────────────────────────────────────────────────────────

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  /** Skip in-flight deduplication (e.g. for mutations that should run every time) */
  skipDedup?: boolean;
  /** Disable retry even for retryable errors */
  noRetry?: boolean;
}

// ── In-flight deduplication ────────────────────────────────────────────────────

const inflight = new Map<string, Promise<SafeResult<unknown>>>();

function requestKey(method: string, path: string, body?: string): string {
  return `${method}:${path}:${body ?? ''}`;
}

// ── Core request function (NEVER throws) ────────────────────────────────────

async function executeRequest<T>(path: string, opts: RequestOptions, attempt: number): Promise<SafeResult<T>> {
  const resolvedPath = resolveApiPath(path);
  const url = `${API_BASE_URL}${resolvedPath}`;
  const method = opts.method ?? 'GET';
  const bodyStr = opts.body != null ? JSON.stringify(opts.body) : undefined;

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers };
  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let errorBody: string | undefined;
      try { errorBody = await res.text(); } catch { /* ignore */ }

      let parsedMsg: string | undefined;
      try {
        const parsed = JSON.parse(errorBody || '');
        parsedMsg = parsed.message || parsed.error;
      } catch { /* not JSON */ }

      // On 401, clear stored auth and redirect to sign-in
      if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('forge_jwt');
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/signin';
        }
      }

      const error = classifyStatus(res.status, parsedMsg || errorBody);

      // Retry retryable errors (5xx)
      if (error.retryable && !opts.noRetry && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return executeRequest<T>(path, opts, attempt + 1);
      }

      return { ok: false, error };
    }

    if (res.status === 204) return { ok: true, data: undefined as unknown as T };
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: new NetworkError('Request timeout') };
    }

    return { ok: false, error: new NetworkError(err instanceof Error ? err.message : 'Unknown network error') };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Make a typed API request. Returns SafeResult — NEVER throws.
 */
async function safeRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<SafeResult<T>> {
  const method = opts.method ?? 'GET';
  const bodyStr = opts.body != null ? JSON.stringify(opts.body) : undefined;

  if (!opts.skipDedup) {
    const key = requestKey(method, path, bodyStr);
    const existing = inflight.get(key);
    if (existing) return existing as Promise<SafeResult<T>>;

    const promise = executeRequest<T>(path, opts, 0);
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
    return promise;
  }

  return executeRequest<T>(path, opts, 0);
}

/**
 * Throwing request — unwraps SafeResult and throws on error.
 * Use ONLY for user-initiated actions (button clicks, form submissions)
 * where you WANT the error to propagate to a catch block.
 * NEVER use on page load / useEffect.
 */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const result = await safeRequest<T>(path, opts);
  if (result.ok) return result.data;
  throw result.error;
}

// ── Throwing convenience methods (for user-initiated actions) ─────────────────

/** Convenience — GET (throws on error) */
export const get = <T>(path: string, opts?: Omit<RequestOptions, 'method'>) =>
  request<T>(path, { ...opts, method: 'GET' });

/** Convenience — POST (throws on error) */
export const post = <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, { ...opts, method: 'POST', body });

/** Convenience — PUT (throws on error) */
export const put = <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, { ...opts, method: 'PUT', body });

/** Convenience — PATCH (throws on error) */
export const patch = <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  request<T>(path, { ...opts, method: 'PATCH', body });

/** Convenience — DELETE (throws on error) */
export const del = <T>(path: string, opts?: Omit<RequestOptions, 'method'>) =>
  request<T>(path, { ...opts, method: 'DELETE' });

// ── Safe (non-throwing) convenience methods ──────────────────────────────────

/** Non-throwing GET */
export function safeGet<T>(path: string): Promise<SafeResult<T>> {
  return safeRequest<T>(path, { method: 'GET' });
}

/** Non-throwing POST */
export function safePost<T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<SafeResult<T>> {
  return safeRequest<T>(path, { ...opts, method: 'POST', body });
}

/** Non-throwing PUT */
export function safePut<T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<SafeResult<T>> {
  return safeRequest<T>(path, { ...opts, method: 'PUT', body });
}
