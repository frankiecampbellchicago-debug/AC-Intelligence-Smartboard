import { spawn as ptySpawn, type IPty } from 'node-pty'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import { join, resolve, basename } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { WebContents } from 'electron'
import type { TerminalCreateOpts, PrepareResult } from '../shared/types'

export type { TerminalCreateOpts, PrepareResult } from '../shared/types'

const exec = promisify(execFile)

/** All cloned sites live here. Terminal cwd is constrained to this root. */
export const WORKSPACE_ROOT = join(homedir(), 'website-cookbook-sites')

const GH_CANDIDATES = ['gh', '/opt/homebrew/bin/gh', '/usr/local/bin/gh']

/** GUI-launched apps inherit a minimal PATH; restore Homebrew/local bins. */
function augmentedEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}` }
}

function ensureWorkspace(): void {
  if (!existsSync(WORKSPACE_ROOT)) mkdirSync(WORKSPACE_ROOT, { recursive: true })
}

/** Never trust a renderer-supplied path: clamp it inside the workspace. */
function safeCwd(cwd?: string): string {
  ensureWorkspace()
  if (!cwd) return WORKSPACE_ROOT
  const r = resolve(cwd)
  if (r === WORKSPACE_ROOT || r.startsWith(WORKSPACE_ROOT + '/')) return r
  return WORKSPACE_ROOT
}

const terminals = new Map<string, IPty>()
let counter = 0

export function createTerminal(sender: WebContents, opts: TerminalCreateOpts): string {
  const cwd = safeCwd(opts.cwd)
  const shell = process.env.SHELL || '/bin/zsh'
  const term = ptySpawn(shell, [], {
    name: 'xterm-color',
    cols: opts.cols ?? 80,
    rows: opts.rows ?? 24,
    cwd,
    env: augmentedEnv()
  })
  const id = `t${++counter}`
  terminals.set(id, term)

  let launched = false
  term.onData((data) => {
    if (!sender.isDestroyed()) sender.send(`term:data:${id}`, data)
    // Once the shell has printed its first prompt, auto-launch Claude Code.
    if (opts.runClaude && !launched) {
      launched = true
      setTimeout(() => {
        try {
          term.write('claude\r')
        } catch {
          /* terminal already gone */
        }
      }, 300)
    }
  })
  term.onExit(() => {
    terminals.delete(id)
    if (!sender.isDestroyed()) sender.send(`term:exit:${id}`)
  })
  return id
}

export function writeTerminal(id: string, data: string): void {
  terminals.get(id)?.write(data)
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  try {
    terminals.get(id)?.resize(Math.max(cols, 1), Math.max(rows, 1))
  } catch {
    /* resize on a dead pty */
  }
}

export function killTerminal(id: string): void {
  const t = terminals.get(id)
  if (t) {
    try {
      t.kill()
    } catch {
      /* already dead */
    }
    terminals.delete(id)
  }
}

export function killAllTerminals(): void {
  for (const t of terminals.values()) {
    try {
      t.kill()
    } catch {
      /* already dead */
    }
  }
  terminals.clear()
}

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

async function runGh(args: string[]): Promise<{ stdout: string; stderr: string }> {
  let lastErr: unknown
  for (const bin of GH_CANDIDATES) {
    try {
      return await exec(bin, args, { env: augmentedEnv(), maxBuffer: 1 << 20 })
    } catch (err) {
      lastErr = err
      if ((err as { code?: string }).code !== 'ENOENT') throw err
    }
  }
  throw lastErr
}

/**
 * Ensure the repo is cloned locally inside the workspace and return its path.
 * The repo identifier is validated; the URL and directory are built here, never
 * accepted from the renderer.
 */
export async function prepareRepo(repoFullName: string): Promise<PrepareResult> {
  if (typeof repoFullName !== 'string' || !REPO_RE.test(repoFullName)) {
    return { error: 'Invalid repository name' }
  }
  ensureWorkspace()
  const repoName = basename(repoFullName).replace(/[^A-Za-z0-9_.-]/g, '')
  if (!repoName) return { error: 'Invalid repository name' }
  const dir = join(WORKSPACE_ROOT, repoName)

  if (existsSync(join(dir, '.git'))) return { localPath: dir, cloned: false }

  try {
    // gh handles auth (public + private); arg array, no shell string.
    await runGh(['repo', 'clone', repoFullName, dir])
    return { localPath: dir, cloned: true }
  } catch (err) {
    const msg =
      (err as { stderr?: string }).stderr ?? (err as { message?: string }).message ?? 'clone failed'
    return { error: msg.toString().slice(0, 300) }
  }
}
