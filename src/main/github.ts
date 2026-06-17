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
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  has_pages: boolean
  language: string | null
  topics?: string[]
  private: boolean
  fork: boolean
  archived: boolean
  pushed_at: string
  default_branch: string
  owner: { login: string }
}

/**
 * Fetch a repo's file tree (paths only) so we can classify it by what's
 * actually in it — e.g. a SKILL.md means it's a Claude skill, not a website.
 * One git-tree call per repo; resilient to empty repos / API errors.
 */
async function listRepoPaths(fullName: string, branch: string): Promise<string[]> {
  const ref = branch || 'main'
  try {
    const out = await runGh([
      'api',
      `repos/${fullName}/git/trees/${ref}?recursive=1`,
      '--jq',
      '.tree[].path'
    ])
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 500)
  } catch {
    return []
  }
}

function rawRepoToGithubRepo(r: RawRepo, paths: string[]): GithubRepo {
  const pagesUrl = r.has_pages ? `https://${r.owner.login}.github.io/${r.name}/` : ''
  const homepage = (r.homepage ?? '').trim()
  return {
    name: r.name,
    fullName: r.full_name,
    repoId: String(r.id),
    description: r.description ?? '',
    repoUrl: r.html_url,
    liveUrl: homepage || pagesUrl,
    language: r.language ?? '',
    topics: r.topics ?? [],
    isPrivate: r.private,
    isFork: r.fork,
    isArchived: r.archived,
    pushedAt: r.pushed_at,
    paths
  }
}

/**
 * Fetch repos for an additional account using a Personal Access Token directly
 * via the GitHub REST API (no `gh` CLI required for additional accounts).
 */
async function listReposForToken(token: string): Promise<GithubRepo[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  const res = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    { headers }
  )
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const repos = (await res.json()) as RawRepo[]
  const result: GithubRepo[] = []
  for (const r of repos) {
    const treeRes = await fetch(
      `https://api.github.com/repos/${r.full_name}/git/trees/${r.default_branch || 'main'}?recursive=1`,
      { headers }
    ).catch(() => null)
    const paths: string[] = []
    if (treeRes?.ok) {
      const tree = (await treeRes.json()) as { tree?: { path: string }[] }
      if (tree.tree) paths.push(...tree.tree.map((n) => n.path).slice(0, 500))
    }
    result.push(rawRepoToGithubRepo(r, paths))
  }
  return result
}

/** Validate a PAT and return the GitHub login it belongs to. */
export async function getLoginForToken(token: string): Promise<string> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const data = (await res.json()) as { login: string }
  return data.login
}

/**
 * Fetch EVERY repo the user has access to — owned, collaborator, and org-member,
 * including forks — each with a computed live URL and (for classification) its
 * file tree. Merges repos from all additional accounts, deduped by repoId.
 */
export async function listRepos(additionalTokens: string[] = []): Promise<GithubRepo[]> {
  const out = await runGh([
    'api',
    'user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    '--paginate'
  ])
  const repos = JSON.parse(out) as RawRepo[]
  const result: GithubRepo[] = []
  for (const r of repos) {
    // Read the file tree so even forks/collaborator repos classify by real content.
    const paths = await listRepoPaths(r.full_name, r.default_branch)
    result.push(rawRepoToGithubRepo(r, paths))
  }

  // Fetch and merge repos from additional accounts, skip duplicates by repoId.
  const seen = new Set(result.map((r) => r.repoId))
  for (const token of additionalTokens) {
    try {
      const extra = await listReposForToken(token)
      for (const r of extra) {
        if (!seen.has(r.repoId)) {
          seen.add(r.repoId)
          result.push(r)
        }
      }
    } catch {
      // one bad token shouldn't break the whole sync
    }
  }

  return result
}
