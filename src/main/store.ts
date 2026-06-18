import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, renameSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_LEADS_SHEET_ID,
  EMPTY_STORE,
  StoreSchema,
  type Store
} from '../shared/types'

/**
 * Atomic, validated JSON persistence for the projects store.
 * - Writes go to a temp file then rename() (atomic on POSIX) so a crash
 *   mid-write can never leave a half-written file.
 * - Every write first backs up the current file to <file>.bak.
 * - Reads are Zod-validated; on corruption we fall back to the .bak, then
 *   to an empty store — the app never white-screens on bad data.
 */

const dataDir = app.getPath('userData')
const STORE_FILE = join(dataDir, 'projects.json')
const STORE_BAK = join(dataDir, 'projects.json.bak')
const SETTINGS_FILE = join(dataDir, 'settings.json')

export type ThemePref = 'light' | 'dark' | 'system'
export interface GithubAccount { login: string; token: string }
export interface Settings {
  theme: ThemePref
  additionalGithubAccounts: GithubAccount[]
  /** Google Sheet id the Leads tab reads from. */
  leadsSheetId: string
}
const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  additionalGithubAccounts: [],
  leadsSheetId: DEFAULT_LEADS_SHEET_ID
}

function ensureDir(file: string): void {
  const dir = dirname(file)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function atomicWrite(file: string, contents: string): void {
  ensureDir(file)
  const tmp = `${file}.tmp`
  writeFileSync(tmp, contents, 'utf-8')
  renameSync(tmp, file)
}

/**
 * Forward-migrate an older persisted document to the current schema.
 * v1 -> v2: just bump the version. The new per-project fields (category,
 * categoryLocked, topics, repoId, syncState, lastSyncedAt) are filled by
 * their Zod defaults on parse — legacy projects were all live websites, so
 * `category` correctly defaults to 'website'. We bump explicitly (rather
 * than relying on a literal that would reject v1 and trigger a data wipe).
 */
function migrate(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object') return doc
  const obj = doc as { schemaVersion?: unknown }
  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) return doc
  return { ...obj, schemaVersion: CURRENT_SCHEMA_VERSION }
}

function parseStore(raw: string): Store | null {
  try {
    return StoreSchema.parse(migrate(JSON.parse(raw)))
  } catch {
    return null
  }
}

export function readStore(): Store {
  if (existsSync(STORE_FILE)) {
    const parsed = parseStore(readFileSync(STORE_FILE, 'utf-8'))
    if (parsed) return parsed
    // Primary file is corrupt — try the backup.
    if (existsSync(STORE_BAK)) {
      const fromBak = parseStore(readFileSync(STORE_BAK, 'utf-8'))
      if (fromBak) return fromBak
    }
  }
  return structuredClone(EMPTY_STORE)
}

export function writeStore(store: Store): Store {
  const validated = StoreSchema.parse(store)
  if (existsSync(STORE_FILE)) {
    try {
      copyFileSync(STORE_FILE, STORE_BAK)
    } catch {
      // backup is best-effort; never block a save on it
    }
  }
  atomicWrite(STORE_FILE, JSON.stringify(validated, null, 2))
  return validated
}

export function readSettings(): Settings {
  if (existsSync(SETTINGS_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      const theme: ThemePref =
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : 'system'
      const additionalGithubAccounts: GithubAccount[] = Array.isArray(
        parsed.additionalGithubAccounts
      )
        ? (parsed.additionalGithubAccounts as unknown[]).filter(
            (a): a is GithubAccount =>
              !!a &&
              typeof (a as GithubAccount).login === 'string' &&
              typeof (a as GithubAccount).token === 'string'
          )
        : []
      const leadsSheetId =
        typeof parsed.leadsSheetId === 'string' && parsed.leadsSheetId.trim()
          ? parsed.leadsSheetId.trim()
          : DEFAULT_LEADS_SHEET_ID
      return { theme, additionalGithubAccounts, leadsSheetId }
    } catch {
      // fall through to defaults
    }
  }
  return { ...DEFAULT_SETTINGS }
}

export function writeSettings(settings: Settings): Settings {
  atomicWrite(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  return settings
}
