/**
 * Client for the local Agentic OS bridge (http://localhost:5177).
 * Lights up the System tabs (Ops / Brain / Sessions) when Kaiden's Mac is
 * running the bridge; everything degrades to a clear offline state otherwise.
 */

const BRIDGE = 'http://localhost:5177'

async function get<T>(path: string, timeoutMs = 8000): Promise<T | null> {
  try {
    const res = await fetch(`${BRIDGE}${path}`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function bridgeOnline(): Promise<boolean> {
  return (await get<{ ok: boolean }>('/api/hub/ping', 2500))?.ok === true
}

export interface BridgeStatus {
  projects: { name: string; branch: string; date: string; msg: string; dirty: number; freight: boolean; live: string | null; liveStatus: string | null }[]
  freight: { loggedIn: boolean; apps: { app: string; label: string; state: string }[]; lastTriage: { when: string; verdict: string; note: string } | null; latestIncident: string | null }
  pulse: { days: string[]; commitsPerDay: number[]; commits7: number; velocity: number; runsPerDay: number[]; runsTotal: number }
  claude: { runs: { skill: string; when: string; verdict: string; worked: string }[]; wip: { project: string; head: string }[] }
}
export const fetchStatus = (): Promise<BridgeStatus | null> => get<BridgeStatus>('/api/status', 60000)

export interface SessionGrade {
  score: number; headline: string; strengths: string[]; improvements: string[]; powerTips: string[]
  gradedAt: string; stats: { msgCount: number; assistantTurns: number; toolCalls: number; durationMin: number | null }
}
export interface SessionRow { id: string; project: string; mtime: string; sizeMB: number; grade: SessionGrade | null }
export const fetchSessions = (): Promise<{ sessions: SessionRow[]; gradingBusy: boolean } | null> =>
  get('/api/hub/sessions', 20000)

export async function gradeSession(id: string): Promise<SessionGrade | { error: string }> {
  try {
    const res = await fetch(`${BRIDGE}/api/hub/sessions/${id}/grade`, {
      method: 'POST',
      signal: AbortSignal.timeout(200000)
    })
    return (await res.json()) as SessionGrade | { error: string }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export interface VaultNode { type: 'dir' | 'file'; name: string; path: string; mtime?: string; children?: VaultNode[] }
export const fetchVaultTree = (): Promise<{ root: string; notes: number; tree: VaultNode[] } | null> =>
  get('/api/vault/tree', 15000)
export const fetchVaultFile = (p: string): Promise<{ path: string; content: string } | null> =>
  get(`/api/vault/file?p=${encodeURIComponent(p)}`, 15000)

/** Fleet health comes from the Railway backend (works for everyone, no bridge needed). */
export interface FleetSite { name: string; url: string; status: number; ok: boolean; ms: number }
export async function fetchFleet(): Promise<{ checkedAt: number; sites: FleetSite[] } | null> {
  const K_BACKEND = 'wc-backend-url'
  const ENV = (import.meta as unknown as { env?: Record<string, string> }).env ?? {}
  const base = ((localStorage.getItem(K_BACKEND) || ENV.VITE_BACKEND_URL || '') as string).replace(/\/$/, '')
  const token = localStorage.getItem('wc-auth-token') || sessionStorage.getItem('wc-auth-token') || ''
  if (!base) return null
  try {
    const res = await fetch(`${base}/fleet`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) return null
    return (await res.json()) as { checkedAt: number; sites: FleetSite[] }
  } catch {
    return null
  }
}
