/**
 * Thin fetch wrapper for the FastAPI backend. Every repository/service call
 * goes through here — no component calls `fetch` directly. Parses the
 * backend's standard error shape ({"error": {"code","message"}}) into a
 * typed `ApiError` so callers can show a real message instead of "failed".
 */

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

// A public production page must never fetch a bare `localhost` URL — Chrome's
// Local Network Access check treats that as the page reaching into the
// user's local network and shows an "Access other apps and services on this
// device" permission prompt on every visit. If the build-time env var is
// missing in production, fail each request instead of silently falling back.
const isMisconfigured = !configuredBaseUrl && import.meta.env.PROD
const API_BASE_URL = configuredBaseUrl ?? 'http://localhost:8000'

// A stalled connection (backend hung, DNS black hole, etc.) leaves `fetch`
// pending forever with no rejection — for gating calls like the maintenance
// check (App.tsx useMaintenanceMode), that freezes the entire public site on
// its loading fallback with no way to recover. Every request gets a hard
// upper bound so a backend hiccup always resolves to a typed error instead.
const REQUEST_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (isMisconfigured) {
    throw new ApiError('config_error', 'API base URL is not configured for this deployment.', 0)
  }

  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? timeoutController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('timeout', 'The request took too long to respond.', 0)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const errorBody = body?.error ?? { code: 'unknown_error', message: 'Something went wrong.' }
    throw new ApiError(errorBody.code, errorBody.message, res.status)
  }

  return body as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(data) })
}
