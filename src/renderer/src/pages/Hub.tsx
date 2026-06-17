import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { Button, CategorySelect } from '../components/ui'
import {
  CATEGORY_LABELS,
  type Project,
  type ProjectCategory
} from '@shared/types'
import { openExternal, revealPath, relativeTime, cn } from '../lib/util'
import { SitePreview } from '../components/SitePreview'
import { IconGit, IconExternal, IconCode, IconFolder, IconRefresh, IconPlus, IconTrash } from '../components/icons'

// Order the non-website groups appear in, top to bottom.
const NONWEB_ORDER: ProjectCategory[] = ['skill', 'assistant', 'automation', 'dashboard', 'other']

/* --------------------------- non-website repo bar -------------------------- */

function RepoBar({ project }: { project: Project }): React.JSX.Element {
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)
  const setCategory = useStore((s) => s.setCategory)
  const removeProject = useStore((s) => s.removeProject)
  const canEdit = Boolean(project.repoFullName || project.localPath)
  const orphaned = project.syncState === 'orphaned'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition hover:-translate-y-px hover:border-border-strong',
        orphaned && 'opacity-70'
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: 'var(--violet)' }}
      />
      <button onClick={() => openProject(project.id)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-bold tracking-tight text-text">{project.name}</div>
        <div className="truncate text-[11px] text-muted">
          {[project.language, project.repoFullName].filter(Boolean).join(' · ') ||
            CATEGORY_LABELS[project.category]}
        </div>
      </button>

      {orphaned && (
        <span className="hidden shrink-0 rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber sm:inline">
          not on GitHub
        </span>
      )}

      <CategorySelect value={project.category} onChange={(c) => setCategory(project.id, c)} />

      <div className="flex shrink-0 items-center gap-1">
        {canEdit && (
          <IconBtn onClick={() => openStudio(project.id)} title="Edit in Studio">
            <IconCode className="h-4 w-4" />
          </IconBtn>
        )}
        {project.repoUrl && (
          <IconBtn onClick={() => openExternal(project.repoUrl)} title="GitHub repo">
            <IconGit className="h-4 w-4" />
          </IconBtn>
        )}
        {project.liveUrl && (
          <IconBtn onClick={() => openExternal(project.liveUrl)} title="Open live">
            <IconExternal className="h-4 w-4" />
          </IconBtn>
        )}
        {project.localPath && (
          <IconBtn onClick={() => revealPath(project.localPath)} title="Reveal folder">
            <IconFolder className="h-4 w-4" />
          </IconBtn>
        )}
        {orphaned && (
          <IconBtn
            onClick={() => {
              if (confirm(`Remove "${project.name}"? Its repo is gone from GitHub.`)) {
                removeProject(project.id)
              }
            }}
            title="Remove"
            danger
          >
            <IconTrash className="h-4 w-4" />
          </IconBtn>
        )}
      </div>
    </div>
  )
}

function IconBtn({
  onClick,
  title,
  danger,
  children
}: {
  onClick: () => void
  title: string
  danger?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg transition',
        danger ? 'text-muted hover:text-red' : 'text-muted hover:border-accent hover:text-accent'
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------- website card ------------------------------ */

function WebsiteCard({ project }: { project: Project }): React.JSX.Element {
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)
  const canEdit = Boolean(project.repoFullName || project.localPath)
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-border-strong">
      <div className="relative">
        <SitePreview url={project.liveUrl} height={150} />
        <button
          onClick={() => openProject(project.id)}
          className="absolute inset-0 transition group-hover:bg-accent/5"
          aria-label={`Open ${project.name}`}
        />
      </div>
      <div className="p-3.5">
        <div className="truncate text-sm font-bold tracking-tight text-text">{project.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
          {project.language && <span>{project.language}</span>}
          {project.language && <span>·</span>}
          <span>updated {relativeTime(project.updatedAt)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canEdit && (
            <button
              onClick={() => openStudio(project.id)}
              className="bg-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--ink-fg)] transition hover:opacity-90"
            >
              <IconCode className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {project.liveUrl && (
            <button
              onClick={() => openExternal(project.liveUrl)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
            >
              <IconExternal className="h-3.5 w-3.5" /> Live
            </button>
          )}
          {project.repoUrl && (
            <button
              onClick={() => openExternal(project.repoUrl)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
            >
              <IconGit className="h-3.5 w-3.5" /> Repo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupLabel({ label, count }: { label: string; count: number }): React.JSX.Element {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</span>
      <span className="rounded-full bg-bg px-1.5 text-[10px] font-bold text-muted">{count}</span>
    </div>
  )
}

/* ---------------------------------- page ----------------------------------- */

export function Hub(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const setView = useStore((s) => s.setView)
  const githubStatus = useStore((s) => s.githubStatus)
  const githubSyncing = useStore((s) => s.githubSyncing)
  const lastSync = useStore((s) => s.lastSync)
  const syncFromGitHub = useStore((s) => s.syncFromGitHub)
  const query = useStore((s) => s.topQuery)
  const connected = githubStatus?.connected

  const { groups, websites, orphans } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p: Project): boolean =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q) ||
      p.repoFullName.toLowerCase().includes(q) ||
      p.topics.some((t) => t.toLowerCase().includes(q))

    const active = projects.filter((p) => p.syncState !== 'orphaned' && match(p))
    const groups = NONWEB_ORDER.map((cat) => ({
      cat,
      items: active.filter((p) => p.category === cat)
    })).filter((g) => g.items.length > 0)
    const websites = active.filter((p) => p.category === 'website')
    const orphans = projects.filter((p) => p.syncState === 'orphaned' && match(p))
    return { groups, websites, orphans }
  }, [projects, query])

  const empty = groups.length === 0 && websites.length === 0 && orphans.length === 0

  return (
    <div className="space-y-5">
      {/* GitHub connection */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              connected ? 'bg-emerald/15 text-emerald' : 'bg-bg text-subtle'
            )}
          >
            <IconGit className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight text-text">
              {connected ? `Connected as ${githubStatus?.login}` : 'GitHub not connected'}
            </div>
            <div className="text-xs text-muted">
              {connected
                ? lastSync
                  ? `Last sync: +${lastSync.added} new · ${lastSync.updated} updated${
                      lastSync.orphaned ? ` · ${lastSync.orphaned} orphaned` : ''
                    }`
                  : 'Reads each repo to sort it into the right category.'
                : 'Run `gh auth login`, then sync.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <Button variant="subtle" onClick={() => void syncFromGitHub()} disabled={githubSyncing}>
              <IconRefresh className={cn('h-4 w-4', githubSyncing && 'animate-spin')} />
              {githubSyncing ? 'Syncing…' : 'Sync GitHub'}
            </Button>
          )}
          <Button onClick={() => setView('projects')}>
            <IconPlus className="h-4 w-4" /> Add manually
          </Button>
        </div>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-text">Nothing here yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {connected ? 'Sync to pull in your repos.' : 'Connect GitHub and sync.'}
          </p>
        </div>
      ) : (
        <>
          {/* Non-website repos — grouped, skinny bars */}
          {groups.map((g) => (
            <section key={g.cat}>
              <GroupLabel label={CATEGORY_LABELS[g.cat]} count={g.items.length} />
              <div className="space-y-2">
                {g.items.map((p) => (
                  <RepoBar key={p.id} project={p} />
                ))}
              </div>
            </section>
          ))}

          {/* Websites — preview cards at the bottom */}
          {websites.length > 0 && (
            <section>
              <GroupLabel label="Websites" count={websites.length} />
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {websites.map((p) => (
                  <WebsiteCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          {/* Orphaned — gone from GitHub */}
          {orphans.length > 0 && (
            <section>
              <GroupLabel label="Not on GitHub" count={orphans.length} />
              <div className="space-y-2">
                {orphans.map((p) => (
                  <RepoBar key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
