import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GithubStatus, GithubRepo } from '../shared/types'

export type { GithubStatus, GithubRepo } from '../shared/types'

const exec = promisify(execFile)

/**
 * GitHub integration via the `gh` CLI. We deliberately shell out to the user's
 * already-authenticated gh rather than store a token — no credential handling.
 * All commands use fixed arguments (no shell string interpolation).
 */

// gh may live outside the default PATH when launched from Finder; probe common spots.
const GH_CANDIDATES = ['gh', '/opt/homebrew/bin/gh', '/usr/local/bin/gh', '/usr/bin/gh']

async function runGh(args: string[]): Promise<string> {
  let lastErr: unknown
  for (const bin of GH_CANDIDATES) {
    try {
      const { stdout } = await exec(bin, args, {
        maxBuffer: 1024 * 1024 * 16,
        env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` }
      })
      return stdout
    } catch (err) {
      lastErr = err
      // ENOENT → try next candidate; other errors → real gh error, stop.
      const code = (err as { code?: string }).code
      if (code !== 'ENOENT') throw err
    }
  }
  throw lastErr
}

export async function githubStatus(): Promise<GithubStatus> {
  try {
    const login = (await runGh(['api', 'user', '--jq', '.login'])).trim()
    return { connected: Boolean(login), login }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'ENOENT') return { connected: false, reason: 'gh-not-found' }
    const stderr = (err as { stderr?: string }).stderr ?? ''
    if (/auth|login|token|401/i.test(stderr)) return { connected: false, reason: 'not-authenticated' }
    return { connected: false, reason: 'error', message: stderr.slice(0, 200) }
  }
}

interface RawRepo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  has_pages: boolean
  language: string | null
  private: boolean
  fork: boolean
  pushed_at: string
  owner: { login: string }
}

/** Fetch the authenticated user's repos with a computed live URL for each. */
export async function listRepos(): Promise<GithubRepo[]> {
  const out = await runGh([
    'api',
    'user/repos?per_page=100&sort=pushed&affiliation=owner',
    '--paginate'
  ])
  const repos = JSON.parse(out) as RawRepo[]
  return repos.map((r) => {
    const pagesUrl = r.has_pages ? `https://${r.owner.login}.github.io/${r.name}/` : ''
    const homepage = (r.homepage ?? '').trim()
    return {
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? '',
      repoUrl: r.html_url,
      liveUrl: homepage || pagesUrl,
      language: r.language ?? '',
      isPrivate: r.private,
      isFork: r.fork,
      pushedAt: r.pushed_at
    }
  })
}
