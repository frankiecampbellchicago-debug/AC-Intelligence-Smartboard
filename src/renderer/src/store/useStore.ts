import { create } from 'zustand'
import type { GithubStatus, Project, ProjectStatus, Store } from '@shared/types'

type View = 'dashboard' | 'wizard' | 'projects' | 'resources' | 'settings' | 'terminal' | 'studio'

export interface NewProjectInput {
  name: string
  status?: ProjectStatus
  currentLevel?: number
  liveUrl?: string
  repoUrl?: string
  localPath?: string
  notes?: string
}

interface AppState {
  // navigation
  view: View
  selectedProjectId: string | null
  studioProjectId: string | null
  setView: (v: View) => void
  openProject: (id: string) => void
  openStudio: (id: string) => void

  // data
  hydrated: boolean
  projects: Project[]
  hydrate: () => Promise<void>
  addProject: (input: NewProjectInput) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  removeProject: (id: string) => void
  toggleSkill: (id: string, level: number, skillId: string) => void
  touchOpened: (id: string) => void

  // github
  githubStatus: GithubStatus | null
  githubSyncing: boolean
  checkGithub: () => Promise<void>
  syncFromGitHub: () => Promise<{ added: number; updated: number; removed: number }>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced write of the whole projects array to disk via the main process. */
function schedulePersist(projects: Project[]): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const payload: Store = { schemaVersion: 1, projects }
    void window.api.store.set(payload)
  }, 400)
}

const now = (): number => Date.now()

export const useStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  selectedProjectId: null,
  studioProjectId: null,
  setView: (v) => set({ view: v }),
  openProject: (id) => {
    get().touchOpened(id)
    set({ view: 'projects', selectedProjectId: id })
  },
  openStudio: (id) => {
    get().touchOpened(id)
    set({ view: 'studio', studioProjectId: id })
  },

  hydrated: false,
  projects: [],
  hydrate: async () => {
    const data = await window.api.store.get()
    set({ projects: data.projects, hydrated: true })
  },

  addProject: (input) => {
    const ts = now()
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      currentLevel: input.currentLevel ?? 1,
      status: input.status ?? 'planning',
      liveUrl: input.liveUrl ?? '',
      repoUrl: input.repoUrl ?? '',
      localPath: input.localPath ?? '',
      notes: input.notes ?? '',
      levelProgress: {},
      source: 'manual',
      repoFullName: '',
      language: '',
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts
    }
    const projects = [project, ...get().projects]
    set({ projects })
    schedulePersist(projects)
    return project
  },

  updateProject: (id, patch) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: now() } : p
    )
    set({ projects })
    schedulePersist(projects)
  },

  removeProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id)
    const selectedProjectId = get().selectedProjectId === id ? null : get().selectedProjectId
    set({ projects, selectedProjectId })
    schedulePersist(projects)
  },

  toggleSkill: (id, level, skillId) => {
    const key = String(level)
    const projects = get().projects.map((p) => {
      if (p.id !== id) return p
      const current = p.levelProgress[key] ?? []
      const next = current.includes(skillId)
        ? current.filter((s) => s !== skillId)
        : [...current, skillId]
      return { ...p, levelProgress: { ...p.levelProgress, [key]: next }, updatedAt: now() }
    })
    set({ projects })
    schedulePersist(projects)
  },

  touchOpened: (id) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, lastOpenedAt: now() } : p
    )
    set({ projects })
    schedulePersist(projects)
  },

  githubStatus: null,
  githubSyncing: false,
  checkGithub: async () => {
    try {
      const status = await window.api.github.status()
      set({ githubStatus: status })
    } catch {
      set({ githubStatus: { connected: false, reason: 'error' } })
    }
  },

  syncFromGitHub: async () => {
    set({ githubSyncing: true })
    try {
      // Only repos with a live URL count as websites; skip everything else.
      const repos = (await window.api.github.listRepos()).filter((r) => r.liveUrl)
      const liveNames = new Set(repos.map((r) => r.fullName))
      const ts = now()

      // Drop GitHub-sourced projects that no longer map to a live site
      // (non-website repos, or repos whose Pages were turned off). Manual projects stay.
      const before = get().projects.length
      const projects = get().projects.filter(
        (p) => p.source !== 'github' || liveNames.has(p.repoFullName)
      )
      const removed = before - projects.length

      let added = 0
      let updated = 0
      for (const r of repos) {
        const idx = projects.findIndex((p) => p.repoFullName === r.fullName)
        if (idx >= 0) {
          // Refresh repo-derived fields but preserve the user's own edits.
          const ex = projects[idx]
          projects[idx] = {
            ...ex,
            repoUrl: r.repoUrl,
            liveUrl: ex.liveUrl || r.liveUrl,
            language: r.language,
            updatedAt: ts
          }
          updated++
        } else {
          const isTest = /test|staging|sandbox|demo/i.test(r.name)
          const status: ProjectStatus = isTest ? 'review' : 'shipped'
          const currentLevel = isTest ? 4 : 7
          projects.unshift({
            id: crypto.randomUUID(),
            name: r.name,
            currentLevel,
            status,
            liveUrl: r.liveUrl,
            repoUrl: r.repoUrl,
            localPath: '',
            notes: r.description,
            levelProgress: {},
            source: 'github',
            repoFullName: r.fullName,
            language: r.language,
            createdAt: ts,
            updatedAt: ts,
            lastOpenedAt: ts
          })
          added++
        }
      }
      set({ projects })
      schedulePersist(projects)
      return { added, updated, removed }
    } finally {
      set({ githubSyncing: false })
    }
  }
}))
