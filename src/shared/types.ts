import { z } from 'zod'

/**
 * Project status pipeline. Mirrors how a site moves from idea to live.
 */
export const PROJECT_STATUSES = ['planning', 'building', 'review', 'shipped'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const TOTAL_LEVELS = 7

/**
 * A single tracked website. Persisted to JSON in Electron's userData.
 * Validated with Zod on every read so a corrupt file can't brick the app.
 */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  currentLevel: z.number().int().min(1).max(TOTAL_LEVELS).default(1),
  status: z.enum(PROJECT_STATUSES).default('planning'),
  liveUrl: z.string().default(''),
  repoUrl: z.string().default(''),
  localPath: z.string().default(''),
  notes: z.string().default(''),
  /** Per-level checklist progress: level number -> array of checked skill ids. */
  levelProgress: z.record(z.string(), z.array(z.string())).default({}),
  /** Where this project came from. GitHub-synced projects dedupe on repoFullName. */
  source: z.enum(['manual', 'github']).default('manual'),
  repoFullName: z.string().default(''),
  language: z.string().default(''),
  createdAt: z.number(),
  updatedAt: z.number(),
  /** Distinct from updatedAt so the UI can sort by "most recently opened". */
  lastOpenedAt: z.number()
})
export type Project = z.infer<typeof ProjectSchema>

/** The whole persisted document. Versioned so we can migrate later. */
export const StoreSchema = z.object({
  schemaVersion: z.literal(1),
  projects: z.array(ProjectSchema).default([])
})
export type Store = z.infer<typeof StoreSchema>

export const EMPTY_STORE: Store = { schemaVersion: 1, projects: [] }

/** GitHub integration shapes (shared between main, preload, and renderer). */
export interface GithubStatus {
  connected: boolean
  login?: string
  reason?: 'gh-not-found' | 'not-authenticated' | 'error'
  message?: string
}

export interface GithubRepo {
  name: string
  fullName: string
  description: string
  repoUrl: string
  liveUrl: string
  language: string
  isPrivate: boolean
  isFork: boolean
  pushedAt: string
}

/** Embedded terminal + studio shapes (shared between main, preload, renderer). */
export interface TerminalCreateOpts {
  cwd?: string
  runClaude?: boolean
  cols?: number
  rows?: number
}

export interface PrepareResult {
  localPath?: string
  error?: string
  cloned?: boolean
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  building: 'Building',
  review: 'Review',
  shipped: 'Shipped'
}
