import type { GithubRepo, ProjectCategory } from './types'

/**
 * Repo categorization. Two layers:
 *  - classifyRepo(): reads the repo's actual file tree (paths) — the reliable
 *    signal. A SKILL.md makes it a Claude skill; index.html / framework configs
 *    make it a website; workflows / Python / Docker make it an automation. This
 *    is what fixes mislabels like a Claude skill repo named "…-web-design".
 *  - inferCategory(): name/description/topic heuristic, used only as a fallback
 *    when the file tree couldn't be read (empty repo, API error, fork).
 */

const DASHBOARD_RE =
  /\b(dashboard|dashboards|admin|panel|analytics|metrics|grafana|kibana|insights|reporting|kpi|smartboard)\b/i

const AUTOMATION_RE =
  /\b(bot|cron|workflow|automation|automate|scraper|scrape|pipeline|etl|webhook|integration|scheduler|lambda|worker|daemon|crawler|notifier|cli|agent)\b/i

const WEBSITE_RE =
  /\b(website|websites|web-?site|landing|portfolio|blog|homepage|web-?page|marketing|storefront|ecommerce|e-commerce)\b/i

const SKILL_RE = /\b(claude-?skill|skill|skills|claude-?plugin)\b/i

const ASSISTANT_RE =
  /\b(assistant|assistants|voice-?assistant|chat-?bot|chatbot|copilot|companion|virtual-?assistant)\b/i

export interface Categorizable {
  name: string
  description?: string
  topics?: string[]
  liveUrl?: string
  language?: string
}

function hay(repo: Categorizable): string {
  return [repo.name, repo.description ?? '', ...(repo.topics ?? [])].join(' ').toLowerCase()
}

/** Name/description/topic heuristic — fallback only. */
export function inferCategory(repo: Categorizable): ProjectCategory {
  const h = hay(repo)
  if (SKILL_RE.test(h)) return 'skill'
  if (ASSISTANT_RE.test(h)) return 'assistant'
  if (DASHBOARD_RE.test(h)) return 'dashboard'
  if (AUTOMATION_RE.test(h)) return 'automation'
  if ((repo.language ?? '').toLowerCase() === 'jupyter notebook') return 'dashboard'
  if (repo.liveUrl || WEBSITE_RE.test(h)) return 'website'
  return 'other'
}

/**
 * Content-aware classification from the repo's file tree. Reads what's really
 * in the repo, not just its name.
 */
export function classifyRepo(repo: GithubRepo): ProjectCategory {
  const paths = repo.paths ?? []
  if (paths.length === 0) return inferCategory(repo)

  const lower = paths.map((p) => p.toLowerCase())
  const some = (re: RegExp): boolean => lower.some((p) => re.test(p))
  const root = (name: string): boolean => lower.includes(name)
  const h = hay(repo)

  // 1) Claude skill — the strongest, most specific signal.
  if (
    some(/(^|\/)skill\.md$/) ||
    some(/(^|\/)\.claude-plugin\//) ||
    some(/(^|\/)\.claude\/skills\//) ||
    some(/(^|\/)skills\/[^/]+\/skill\.md$/)
  ) {
    return 'skill'
  }

  // 2) Assistant — voice/chat assistants, copilots, bots (name-driven).
  if (ASSISTANT_RE.test(h)) return 'assistant'

  // 3) Dashboard — keyword-named data/admin apps win over generic "website".
  if (DASHBOARD_RE.test(h)) return 'dashboard'

  // 3) Website — a real front-end: root index.html, a web framework config, or a deploy target.
  if (
    root('index.html') ||
    some(/(^|\/)(next|vite|astro|gatsby|nuxt|remix|svelte|vue)\.config\.[a-z]+$/) ||
    root('vercel.json') ||
    root('netlify.toml') ||
    root('_config.yml') ||
    some(/(^|\/)public\/index\.html$/) ||
    some(/(^|\/)src\/(app|pages|routes)\//) ||
    repo.liveUrl
  ) {
    return 'website'
  }

  // 4) Automation — workflows, scripts, services, containers, language toolchains w/o a front-end.
  if (
    some(/(^|\/)\.github\/workflows\//) ||
    root('requirements.txt') ||
    root('pyproject.toml') ||
    root('dockerfile') ||
    root('makefile') ||
    root('serverless.yml') ||
    root('cargo.toml') ||
    root('go.mod') ||
    some(/(^|\/)bin\//) ||
    some(/(^|\/)scripts?\//) ||
    AUTOMATION_RE.test(h)
  ) {
    return 'automation'
  }

  // 5) Nothing definitive — fall back to the name heuristic, then 'other'.
  return inferCategory(repo)
}
