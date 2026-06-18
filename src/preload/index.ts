import { contextBridge, ipcRenderer } from 'electron'
import type {
  Store,
  GithubStatus,
  GithubRepo,
  TerminalCreateOpts,
  PrepareResult,
  LeadsResult
} from '../shared/types'

type ThemePref = 'light' | 'dark' | 'system'

/**
 * The entire surface the renderer is allowed to touch. Deliberately tiny —
 * no fs, no shell, no ipcRenderer exposed directly.
 */
const api = {
  platform: process.platform,
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  store: {
    get: (): Promise<Store> => ipcRenderer.invoke('store:get'),
    set: (store: Store): Promise<Store> => ipcRenderer.invoke('store:set', store)
  },
  settings: {
    get: (): Promise<{ theme: ThemePref; leadsSheetId: string }> =>
      ipcRenderer.invoke('settings:get'),
    setTheme: (theme: ThemePref): Promise<{ theme: ThemePref; leadsSheetId: string }> =>
      ipcRenderer.invoke('settings:setTheme', theme),
    shouldUseDark: (): Promise<boolean> => ipcRenderer.invoke('theme:shouldUseDark'),
    hasApiKey: (): Promise<boolean> => ipcRenderer.invoke('settings:hasApiKey'),
    setApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('settings:setApiKey', key)
  },
  image: {
    generate: (prompt: string): Promise<{ dataUrl?: string; error?: string }> =>
      ipcRenderer.invoke('image:generate', prompt),
    save: (dataUrl: string, name: string): Promise<{ path?: string; error?: string }> =>
      ipcRenderer.invoke('image:save', { dataUrl, name })
  },
  whiteboard: {
    get: (): Promise<{ items: unknown[] }> => ipcRenderer.invoke('wb:get'),
    set: (data: unknown): Promise<void> => ipcRenderer.invoke('wb:set', data)
  },
  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (path: string): Promise<string> => ipcRenderer.invoke('shell:openPath', path),
    showItemInFolder: (path: string): Promise<void> =>
      ipcRenderer.invoke('shell:showItemInFolder', path)
  },
  github: {
    status: (): Promise<GithubStatus> => ipcRenderer.invoke('github:status'),
    listRepos: (): Promise<GithubRepo[]> => ipcRenderer.invoke('github:listRepos'),
    addAccount: (token: string): Promise<{ login?: string; error?: string }> =>
      ipcRenderer.invoke('github:addAccount', token),
    removeAccount: (login: string): Promise<void> =>
      ipcRenderer.invoke('github:removeAccount', login)
  },
  terminal: {
    create: (opts: TerminalCreateOpts): Promise<string> => ipcRenderer.invoke('term:create', opts),
    onData: (id: string, cb: (data: string) => void): (() => void) => {
      const ch = `term:data:${id}`
      const listener = (_e: unknown, data: string): void => cb(data)
      ipcRenderer.on(ch, listener)
      return () => ipcRenderer.removeListener(ch, listener)
    },
    onExit: (id: string, cb: () => void): (() => void) => {
      const ch = `term:exit:${id}`
      const listener = (): void => cb()
      ipcRenderer.on(ch, listener)
      return () => ipcRenderer.removeListener(ch, listener)
    },
    write: (id: string, data: string): void => ipcRenderer.send('term:input', { id, data }),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('term:resize', { id, cols, rows }),
    kill: (id: string): void => ipcRenderer.send('term:kill', { id })
  },
  studio: {
    prepareRepo: (repoFullName: string): Promise<PrepareResult> =>
      ipcRenderer.invoke('studio:prepareRepo', repoFullName)
  },
  leads: {
    fetch: (): Promise<LeadsResult> => ipcRenderer.invoke('leads:fetch'),
    getSheetId: (): Promise<string> => ipcRenderer.invoke('leads:getSheetId'),
    setSheetId: (idOrUrl: string): Promise<string> =>
      ipcRenderer.invoke('leads:setSheetId', idOrUrl)
  }
}

export type CookbookApi = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // Fallback when contextIsolation is somehow off.
  ;(globalThis as unknown as { api: CookbookApi }).api = api
}
