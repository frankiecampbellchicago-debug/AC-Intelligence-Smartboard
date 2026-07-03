/**
 * Login-gate client. Talks to the shared backend's /login, /me, /auth/config.
 *
 * "Remember me": on success the session token is stored in localStorage (survives
 * restarts, ~30 days) when remember is checked, else sessionStorage (cleared when
 * the tab closes). getToken() reads whichever is present, so the shim can attach it.
 *
 * The gate only engages in web mode with a backend configured AND when the backend
 * reports loginRequired — otherwise the app renders normally (Electron, local dev).
 */

const K_BACKEND = 'wc-backend-url'
const K_TOKEN = 'wc-auth-token'
const ENV = (import.meta as unknown as { env?: Record<string, string> }).env ?? {}

function backendUrl(): string {
  return ((localStorage.getItem(K_BACKEND) || ENV.VITE_BACKEND_URL || '') as string).replace(/\/$/, '')
}

export function isWebPlatform(): boolean {
  return (window as { api?: { platform?: string } }).api?.platform === 'web'
}

export function getToken(): string {
  return localStorage.getItem(K_TOKEN) || sessionStorage.getItem(K_TOKEN) || ''
}

function setToken(token: string, remember: boolean): void {
  clearToken()
  if (remember) localStorage.setItem(K_TOKEN, token)
  else sessionStorage.setItem(K_TOKEN, token)
}

export function clearToken(): void {
  localStorage.removeItem(K_TOKEN)
  sessionStorage.removeItem(K_TOKEN)
}

/** Does the server want a login? Only meaningful in web mode with a backend URL. */
export async function loginRequired(): Promise<boolean> {
  if (!isWebPlatform() || !backendUrl()) return false
  try {
    const res = await fetch(backendUrl() + '/auth/config')
    if (!res.ok) return false
    const data = (await res.json()) as { loginRequired?: boolean }
    return Boolean(data.loginRequired)
  } catch {
    return false // backend unreachable — don't lock the user out of a broken gate
  }
}

/** Validate the stored token against the server. */
export async function checkSession(): Promise<boolean> {
  const token = getToken()
  if (!token || !backendUrl()) return false
  try {
    const res = await fetch(backendUrl() + '/me', { headers: { Authorization: `Bearer ${token}` } })
    return res.ok
  } catch {
    return false
  }
}

export async function login(
  username: string,
  password: string,
  remember: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!backendUrl()) return { ok: false, error: 'No backend configured' }
  try {
    const res = await fetch(backendUrl() + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember })
    })
    const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
    if (!res.ok || !data.token) return { ok: false, error: data.error || 'Login failed' }
    setToken(data.token, remember)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function logout(): void {
  clearToken()
}
