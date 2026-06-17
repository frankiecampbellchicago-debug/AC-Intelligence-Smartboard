import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useInbox } from '../store/useInbox'
import { Button } from '../components/ui'
import { LEVELS, TOTAL_LEVELS } from '@shared/levels'
import {
  PROJECT_CATEGORIES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  type Project,
  type ProjectCategory
} from '@shared/types'
import { relativeTime, openExternal, revealPath, cn } from '../lib/util'
import {
  IconPlus,
  IconExternal,
  IconGit,
  IconCode,
  IconFolder,
  IconRefresh,
  IconCheck
} from '../components/icons'

/* --------------------------------- pieces --------------------------------- */

/** One labeled horizontal bar in the Overview panel. */
function BarRow({
  label,
  value,
  max
}: {
  label: string
  value: number
  max: number
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-[12px] font-medium tracking-tight text-muted">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, (value / max) * 100)}%`, background: 'var(--accent)' }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-sm font-bold tabular-nums text-text">{value}</span>
    </div>
  )
}

function Avatar({ project, size = 36 }: { project: Project; size?: number }): React.JSX.Element {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{
        width: size,
        height: size,
        background: 'var(--violet)',
        color: '#fff',
        border: '1px solid rgba(0,0,0,0.08)'
      }}
    >
      {project.name.charAt(0).toUpperCase()}
    </span>
  )
}

/* -------------------------------- calendar -------------------------------- */

function MiniCalendar(): React.JSX.Element {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const monthName = now.toLocaleString('en-US', { month: 'long' })
  const first = new Date(year, month, 1)
  // Monday-first offset.
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-base font-semibold text-text">
          {monthName} {year}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] font-semibold uppercase text-subtle">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-xs">
        {cells.map((d, i) => (
          <div key={i} className="flex justify-center">
            {d == null ? (
              <span />
            ) : (
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full',
                  d === today ? 'font-bold text-[var(--ink-fg)]' : 'text-text'
                )}
                style={d === today ? { background: 'var(--accent)' } : undefined}
              >
                {d}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------- dashboard ------------------------------- */

export function Dashboard(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const setView = useStore((s) => s.setView)
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)
  const githubStatus = useStore((s) => s.githubStatus)
  const githubSyncing = useStore((s) => s.githubSyncing)
  const syncFromGitHub = useStore((s) => s.syncFromGitHub)
  const mail = useInbox((s) => s.messages)
  const selectMail = useInbox((s) => s.select)

  const inboxMsgs = useMemo(() => mail.filter((m) => m.folder === 'inbox'), [mail])
  const unreadMail = inboxMsgs.filter((m) => !m.read).length
  const recentMail = useMemo(
    () => [...inboxMsgs].sort((a, b) => b.date - a.date).slice(0, 3),
    [inboxMsgs]
  )

  const active = useMemo(() => projects.filter((p) => p.syncState !== 'orphaned'), [projects])

  const total = active.length
  const shipped = active.filter((p) => p.status === 'shipped').length
  const building = active.filter((p) => p.status === 'building' || p.status === 'review').length
  const planning = active.filter((p) => p.status === 'planning').length
  const avgLevel = total > 0 ? (active.reduce((a, p) => a + p.currentLevel, 0) / total).toFixed(1) : '—'
  const catCount = (c: ProjectCategory): number => active.filter((p) => p.category === c).length
  const maxCat = Math.max(1, ...PROJECT_CATEGORIES.map(catCount))
  const maxStatus = Math.max(1, shipped, building, planning)

  const list = useMemo(() => [...active].sort((a, b) => b.updatedAt - a.updatedAt), [active])
  const recent = list.slice(0, 5)

  const [selId, setSelId] = useState<string | null>(null)
  const selected = list.find((p) => p.id === selId) ?? list[0] ?? null
  useEffect(() => {
    if (selId && !list.some((p) => p.id === selId)) setSelId(null)
  }, [selId, list])

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="font-display text-3xl font-bold tracking-[-0.01em] text-text">{greet}, Kaiden</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          No projects yet. Sync GitHub to pull your repos in, or add one by hand.
        </p>
        <div className="mt-5 flex gap-3">
          <Button onClick={() => void syncFromGitHub()} disabled={githubSyncing}>
            <IconRefresh className={cn('h-4 w-4', githubSyncing && 'animate-spin')} /> Sync GitHub
          </Button>
          <Button variant="subtle" onClick={() => setView('hub')}>
            <IconPlus className="h-4 w-4" /> Add a project
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-stretch gap-5">
      {/* Ambient color wash so the glass widgets have something to refract. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-10 h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.12] blur-3xl" />
        <div className="absolute right-0 top-44 h-80 w-80 rounded-full bg-[var(--violet)] opacity-[0.10] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[var(--cyan)] opacity-[0.07] blur-3xl" />
      </div>
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Greeting */}
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-bold leading-[1.08] tracking-[-0.01em] text-text">
              {greet}, Kaiden
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-snug tracking-tight text-muted">
              AC Intelligence — {total} {total === 1 ? 'project' : 'projects'} tracked,{' '}
              {shipped} shipped and {building} in progress. Keep building.
            </p>
          </div>
          <button onClick={() => setView('hub')} className="shrink-0 text-xs font-semibold text-accent hover:underline">
            Show all
          </button>
        </div>

        {/* Overview — one clean panel of labeled bars */}
        <div className="widget shrink-0 rounded-2xl p-5">
          <div className="mb-4 flex items-end justify-between">
            <h3 className="font-display text-lg font-semibold text-text">Overview</h3>
            <span className="text-xs tracking-tight text-muted">
              {total} projects · avg level {avgLevel}
            </span>
          </div>
          <div className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            <div className="space-y-2.5">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                By category
              </div>
              {PROJECT_CATEGORIES.map((c) => (
                <BarRow key={c} label={CATEGORY_LABELS[c]} value={catCount(c)} max={maxCat} />
              ))}
            </div>
            <div className="space-y-2.5">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                By status
              </div>
              <BarRow label={STATUS_LABELS.shipped} value={shipped} max={maxStatus} />
              <BarRow label="In progress" value={building} max={maxStatus} />
              <BarRow label={STATUS_LABELS.planning} value={planning} max={maxStatus} />
            </div>
          </div>
        </div>

        {/* List + details — equal-height cards, bottoms aligned */}
        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
          {/* Projects list */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-text">Projects</h3>
              <button onClick={() => setView('hub')} className="text-xs font-semibold text-accent hover:underline">
                View all
              </button>
            </div>
            <div
              className="widget flex-1 space-y-1 overflow-y-auto rounded-2xl p-2"
            >
              {recent.map((p) => {
                const isSel = selected?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelId(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-bg"
                    style={
                      isSel
                        ? { background: 'var(--accent-soft)' }
                        : undefined
                    }
                  >
                    <Avatar project={p} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-text">{p.name}</div>
                      <div className="truncate text-[11px] text-muted">
                        {CATEGORY_LABELS[p.category]} · Level {p.currentLevel}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-muted">
                      {relativeTime(p.updatedAt)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Project details */}
          <div className="flex min-h-0 flex-col">
            <h3 className="mb-2 shrink-0 font-display text-lg font-semibold text-text">Project details</h3>
            {selected ? (
              <div className="widget flex-1 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar project={selected} size={42} />
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-semibold text-text">{selected.name}</div>
                    <div className="text-[11px] text-muted">
                      {CATEGORY_LABELS[selected.category]} · Level {selected.currentLevel} of {TOTAL_LEVELS} ·{' '}
                      {LEVELS[selected.currentLevel - 1].title}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Tag>{STATUS_LABELS[selected.status]}</Tag>
                  {selected.language && <Tag>{selected.language}</Tag>}
                  {selected.repoFullName && <Tag>{selected.repoFullName}</Tag>}
                </div>

                {selected.notes && (
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap rounded-xl bg-bg p-3 text-xs text-text">
                    {selected.notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(selected.repoFullName || selected.localPath) && (
                    <Button onClick={() => openStudio(selected.id)}>
                      <IconCode className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  {selected.liveUrl && (
                    <MiniLink onClick={() => openExternal(selected.liveUrl)} Icon={IconExternal} label="Live" />
                  )}
                  {selected.repoUrl && (
                    <MiniLink onClick={() => openExternal(selected.repoUrl)} Icon={IconGit} label="Repo" />
                  )}
                  {selected.localPath && (
                    <MiniLink onClick={() => revealPath(selected.localPath)} Icon={IconFolder} label="Folder" />
                  )}
                  <button
                    onClick={() => openProject(selected.id)}
                    className="ml-auto text-xs font-semibold text-accent hover:underline"
                  >
                    Open
                  </button>
                </div>
              </div>
            ) : (
              <div className="widget flex-1 rounded-2xl p-6 text-center text-sm text-muted">
                Select a project.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right column: inbox + calendar + activity */}
      <aside className="hidden w-72 shrink-0 flex-col gap-4 xl:flex">
        {/* Inbox widget */}
        <div className="widget shrink-0 rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-semibold text-text">Inbox</span>
              {unreadMail > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {unreadMail}
                </span>
              )}
            </div>
            <button
              onClick={() => setView('inbox')}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Open
            </button>
          </div>
          <div className="space-y-1">
            {recentMail.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  selectMail(m.id)
                  setView('inbox')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-bg"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-muted">
                  {m.from.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-[13px]', m.read ? 'font-medium text-text' : 'font-bold text-text')}>
                    {m.from.name}
                  </div>
                  <div className="truncate text-[11px] text-muted">{m.subject}</div>
                </div>
                {!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
        </div>

        <div className="widget shrink-0 rounded-[22px] p-4">
          <MiniCalendar />
          <div className="mt-3 flex items-center gap-2">
            <Button className="flex-1" onClick={() => setView('hub')}>
              <IconPlus className="h-4 w-4" /> Add project
            </Button>
            <button
              onClick={() => void syncFromGitHub()}
              disabled={githubSyncing}
              title="Sync GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg text-muted transition hover:text-text disabled:opacity-50"
            >
              <IconRefresh className={cn('h-4 w-4', githubSyncing && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="widget flex min-h-0 flex-1 flex-col rounded-[22px] p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <span className="font-display text-base font-semibold text-text">Recent activity</span>
            <span className="text-[11px] text-subtle">
              {githubStatus?.connected ? githubStatus.login : 'local'}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => openProject(p.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: 'var(--violet)', border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">{p.name}</div>
                  <div className="truncate text-[11px] text-muted">
                    Updated {relativeTime(p.updatedAt)} · {CATEGORY_LABELS[p.category]}
                  </div>
                </div>
                {p.status === 'shipped' && <IconCheck className="mt-1 h-3.5 w-3.5 text-green" />}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full shrink-0" onClick={() => setView('hub')}>
            View all projects
          </Button>
        </div>
      </aside>
    </div>
  )
}

/* ------------------------------- tiny helpers ------------------------------ */

function Tag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-text" style={{ border: `1px solid var(--border-strong)` }}>
      {children}
    </span>
  )
}

function MiniLink({
  onClick,
  Icon,
  label
}: {
  onClick: () => void
  Icon: (p: { className?: string }) => React.JSX.Element
  label: string
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-text/40"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

