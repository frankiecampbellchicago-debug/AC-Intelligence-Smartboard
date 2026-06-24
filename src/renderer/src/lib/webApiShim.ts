/**
 * Web API shim — provides the same window.api surface as the Electron preload,
 * implemented with browser-native APIs (localStorage, WebSocket, fetch).
 * Injected in main.tsx when window.api is absent (browser context).
 */

import type { Store, GithubStatus, GithubRepo, TerminalCreateOpts, PrepareResult } from '@shared/types'
import { CURRENT_SCHEMA_VERSION, EMPTY_STORE, StoreSchema } from '@shared/types'

// ── Storage keys ───────────────────────────────────────────────────────────

const K_STORE = 'wc-store'
const K_WHITEBOARD = 'wc-whiteboard'
const K_THEME = 'wc-theme'
const K_OPENROUTER = 'wc-openrouter-key'
const K_ACCOUNTS = 'wc-github-accounts'
const K_BACKEND = 'wc-backend-url'

type ThemePref = 'light' | 'dark' | 'system'

interface GithubAccount { login: string; token: string }

// ── Helpers ────────────────────────────────────────────────────────────────

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(K_STORE)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      return StoreSchema.parse(parsed)
    }
  } catch { /* corrupt — fall through */ }
  return structuredClone(EMPTY_STORE)
}

function getAccounts(): GithubAccount[] {
  try {
    const raw = localStorage.getItem(K_ACCOUNTS)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown[]
    return arr.filter(
      (a): a is GithubAccount =>
        !!a && typeof (a as GithubAccount).login === 'string' && typeof (a as GithubAccount).token === 'string'
    )
  } catch { return [] }
}

function setAccounts(accounts: GithubAccount[]): void {
  localStorage.setItem(K_ACCOUNTS, JSON.stringify(accounts))
}

// ── GitHub REST helpers ────────────────────────────────────────────────────

const GH_HEADERS = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
})

interface RawRepo {
  id: number; name: string; full_name: string; description: string | null
  html_url: string; homepage: string | null; has_pages: boolean
  language: string | null; topics?: string[]; private: boolean; fork: boolean
  archived: boolean; pushed_at: string; default_branch: string
  owner: { login: string }
}

async function fetchReposForToken(token: string): Promise<GithubRepo[]> {
  const headers = GH_HEADERS(token)
  const res = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    { headers }
  )
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const repos = (await res.json()) as RawRepo[]
  const result: GithubRepo[] = []
  for (const r of repos) {
    const paths = await fetchRepoPaths(r.full_name, r.default_branch, token)
    const pagesUrl = r.has_pages ? `https://${r.owner.login}.github.io/${r.name}/` : ''
    result.push({
      name: r.name, fullName: r.full_name, repoId: String(r.id),
      description: r.description ?? '', repoUrl: r.html_url,
      liveUrl: (r.homepage ?? '').trim() || pagesUrl,
      language: r.language ?? '', topics: r.topics ?? [],
      isPrivate: r.private, isFork: r.fork, isArchived: r.archived, pushedAt: r.pushed_at, paths
    })
  }
  return result
}

async function fetchRepoPaths(fullName: string, branch: string, token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${branch || 'main'}?recursive=1`,
      { headers: GH_HEADERS(token) }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { tree?: { path: string }[] }
    return (data.tree ?? []).map(n => n.path).slice(0, 500)
  } catch { return [] }
}

// ── Terminal WebSocket pool ────────────────────────────────────────────────

const termSockets = new Map<string, WebSocket>()
const termDataListeners = new Map<string, Set<(d: string) => void>>()
const termExitListeners = new Map<string, Set<() => void>>()
const termPendingData = new Map<string, string[]>()

function getBackendUrl(): string {
  return (localStorage.getItem(K_BACKEND) ?? '').replace(/\/$/, '')
}

// ── The shim object ────────────────────────────────────────────────────────

export function createWebApi(): typeof window.api {
  return {
    platform: 'web' as NodeJS.Platform,

    window: {
      minimize: () => {},
      maximize: () => {},
      close: () => {}
    },

    store: {
      get: async () => loadStore(),
      set: async (store: Store) => {
        const validated = StoreSchema.parse(store)
        localStorage.setItem(K_STORE, JSON.stringify(validated))
        return validated
      }
    },

    settings: {
      get: async () => ({ theme: (localStorage.getItem(K_THEME) ?? 'system') as ThemePref }),
      setTheme: async (theme: ThemePref) => {
        localStorage.setItem(K_THEME, theme)
        return { theme }
      },
      shouldUseDark: async () => {
        const t = localStorage.getItem(K_THEME) ?? 'system'
        return t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      },
      hasApiKey: async () => Boolean(localStorage.getItem(K_OPENROUTER)),
      setApiKey: async (key: string) => {
        if (key.trim()) localStorage.setItem(K_OPENROUTER, key.trim())
        else localStorage.removeItem(K_OPENROUTER)
        return Boolean(key.trim())
      }
    },

    image: {
      generate: async (prompt: string) => {
        const key = localStorage.getItem(K_OPENROUTER)
        if (!key) return { error: 'No OpenRouter API key. Add one in Settings.' }
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-image-preview',
              messages: [{ role: 'user', content: prompt }],
              modalities: ['image', 'text']
            })
          })
          if (!res.ok) return { error: `OpenRouter ${res.status}: ${(await res.text()).slice(0, 160)}` }
          const data = (await res.json()) as {
            choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[]
          }
          const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
          if (!url) return { error: 'No image returned by the model.' }
          return { dataUrl: url }
        } catch (e) {
          return { error: (e as Error).message }
        }
      },
      save: async (dataUrl: string, name: string) => {
        try {
          const a = document.createElement('a')
          a.href = dataUrl
          const safe = (name.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'image').toLowerCase()
          a.download = `${safe}.png`
          a.click()
          return { path: name }
        } catch (e) {
          return { error: (e as Error).message }
        }
      }
    },

    whiteboard: {
      get: async () => {
        try {
          return JSON.parse(localStorage.getItem(K_WHITEBOARD) ?? '{"items":[]}') as { items: unknown[] }
        } catch { return { items: [] } }
      },
      set: async (data: unknown) => {
        localStorage.setItem(K_WHITEBOARD, JSON.stringify(data))
      }
    },

    shell: {
      openExternal: async (url: string) => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      },
      openPath: async (_path: string) => '',
      showItemInFolder: async (_path: string) => {}
    },

    github: {
      status: async (): Promise<GithubStatus> => {
        const accounts = getAccounts()
        if (!accounts.length) return { connected: false, reason: 'not-authenticated' }
        return {
          connected: true,
          login: accounts[0].login,
          additionalAccounts: accounts.slice(1).map(a => ({ login: a.login }))
        }
      },
      listRepos: async (): Promise<GithubRepo[]> => {
        const accounts = getAccounts()
        if (!accounts.length) return []
        const seen = new Set<string>()
        const all: GithubRepo[] = []
        for (const acc of accounts) {
          try {
            const repos = await fetchReposForToken(acc.token)
            for (const r of repos) {
              if (!seen.has(r.repoId)) { seen.add(r.repoId); all.push(r) }
            }
          } catch { /* one bad token shouldn't break everything */ }
        }
        return all
      },
      addAccount: async (token: string) => {
        if (!token.trim()) return { error: 'Invalid token' }
        try {
          const res = await fetch('https://api.github.com/user', {
            headers: GH_HEADERS(token.trim())
          })
          if (!res.ok) return { error: 'Token is invalid or GitHub is unreachable' }
          const user = (await res.json()) as { login: string }
          const accounts = getAccounts()
          if (accounts.some(a => a.login === user.login)) return { error: `@${user.login} is already connected` }
          setAccounts([...accounts, { login: user.login, token: token.trim() }])
          return { login: user.login }
        } catch {
          return { error: 'Token is invalid or GitHub is unreachable' }
        }
      },
      removeAccount: async (login: string) => {
        setAccounts(getAccounts().filter(a => a.login !== login))
      }
    },

    terminal: {
      create: async (opts: TerminalCreateOpts): Promise<string> => {
        const backendUrl = getBackendUrl()
        if (!backendUrl) throw new Error('NO_BACKEND_URL')
        const wsUrl = backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/terminal'
        const ws = new WebSocket(wsUrl)

        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => { ws.close(); reject(new Error('Connection timeout')) }, 8000)
          let termId: string | null = null

          ws.onopen = () => { ws.send(JSON.stringify({ type: 'create', ...opts })) }

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data as string) as { type: string; id?: string; data?: string }

              if (msg.type === 'created' && !termId) {
                clearTimeout(timeout)
                termId = msg.id!
                termSockets.set(termId, ws)
                termDataListeners.set(termId, new Set())
                termExitListeners.set(termId, new Set())
                termPendingData.set(termId, [])

                ws.onmessage = (e) => {
                  try {
                    const m = JSON.parse(e.data as string) as { type: string; data?: string }
                    const id = termId!
                    if (m.type === 'data') {
                      const listeners = termDataListeners.get(id)
                      if (listeners && listeners.size > 0) {
                        listeners.forEach(cb => cb(m.data!))
                      } else {
                        termPendingData.get(id)?.push(m.data!)
                      }
                    } else if (m.type === 'exit') {
                      termExitListeners.get(id)?.forEach(cb => cb())
                    }
                  } catch { /* ignore */ }
                }

                resolve(termId)
              }
            } catch { /* ignore */ }
          }

          ws.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to connect to terminal server')) }
        })
      },

      onData: (id: string, cb: (data: string) => void) => {
        const listeners = termDataListeners.get(id)
        if (!listeners) return () => {}
        listeners.add(cb)
        // Flush any buffered data that arrived before onData was registered
        const pending = termPendingData.get(id)
        if (pending && pending.length > 0) {
          const flushed = [...pending]
          termPendingData.set(id, [])
          flushed.forEach(d => cb(d))
        }
        return () => { listeners.delete(cb) }
      },

      onExit: (id: string, cb: () => void) => {
        const listeners = termExitListeners.get(id)
        if (!listeners) return () => {}
        listeners.add(cb)
        return () => { listeners.delete(cb) }
      },

      write: (id: string, data: string) => {
        termSockets.get(id)?.send(JSON.stringify({ type: 'input', id, data }))
      },

      resize: (id: string, cols: number, rows: number) => {
        termSockets.get(id)?.send(JSON.stringify({ type: 'resize', id, cols, rows }))
      },

      kill: (id: string) => {
        termSockets.get(id)?.send(JSON.stringify({ type: 'kill', id }))
        termSockets.get(id)?.close()
        termSockets.delete(id)
        termDataListeners.delete(id)
        termExitListeners.delete(id)
        termPendingData.delete(id)
      }
    },

    studio: {
      prepareRepo: async (_repoFullName: string): Promise<PrepareResult> => ({
        error: 'Studio cloning is not available in the web version.'
      })
    }
  }
}

// ── Export a flag so components can detect web mode ────────────────────────
export const IS_WEB = true
export { K_BACKEND }

// ── Migrate legacy store if needed ────────────────────────────────────────
export function migrateWebStore(): void {
  const raw = localStorage.getItem(K_STORE)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as { schemaVersion?: number }
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      parsed.schemaVersion = CURRENT_SCHEMA_VERSION
      localStorage.setItem(K_STORE, JSON.stringify(parsed))
    }
  } catch { localStorage.removeItem(K_STORE) }
}
