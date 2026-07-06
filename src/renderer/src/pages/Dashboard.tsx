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
import dashHero from '../assets/dash-hero.jpg'

/** One KPI tile in the hero stat row. */
function StatTile({
  label,
  value,
  tint,
  sub
}: {
  label: string
  value: string | number
  tint?: string
  sub?: string
}): React.JSX.Element {
  return (
    <div className="widget flex-1 rounded-[16px] px-5 py-4">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-subtle">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="font-display tnum text-[30px] font-bold leading-none text-text"
          style={tint ? { color: tint } : undefined}
        >
          {value}
        </span>
        {sub && <span className="text-[11px] font-medium text-muted">{sub}</span>}
      </div>
    </div>
  )
}

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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(3, (value / max) * 100)}%`,
            background: 'linear-gradient(90deg, var(--brand-from), var(--brand-to))',
            boxShadow: '0 0 12px -2px rgba(140,100,255,.6)'
          }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-sm font-bold tabular-nums text-text">{value}</span>
    </div>
  )
}

function Avatar({ project, size = 36 }: { project: Project; size?: number }): React.JSX.Element {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #262c38 0%, #12151c 100%)',
        border: '1px solid rgba(255,255,255,0.14)'
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

  /* The aurora hero band — renders in both empty and populated states. */
  const heroBand = (
    <div className="relative shrink-0 overflow-hidden rounded-[20px] border border-border shadow-[0_30px_70px_-24px_rgba(0,0,0,0.8)]">
      <img
        src={dashHero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[50%_38%]"
        draggable={false}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(7,7,13,.78) 0%, rgba(7,7,13,.45) 46%, rgba(7,7,13,.15) 100%), linear-gradient(0deg, rgba(7,7,13,.72) 0%, transparent 42%)'
        }}
      />
      <div className="relative px-6 pb-5 pt-6">
        <p className="eyebrow">Ops Hub</p>
        <h1 className="font-display mt-2 text-[30px] font-extrabold leading-[1.05] text-white">
          {greet}, <span className="text-brand">Kaiden</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-snug text-white/75">
          {total === 0 ? (
            <>Your command center is live. Pull your repos in and light the board up.</>
          ) : (
            <>
              <span className="tnum">{total}</span> {total === 1 ? 'project' : 'projects'} tracked,{' '}
              <span className="tnum">{shipped}</span> shipped and <span className="tnum">{building}</span>{' '}
              in progress. Keep building.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button onClick={() => void syncFromGitHub()} disabled={githubSyncing}>
            <IconRefresh className={cn('h-4 w-4', githubSyncing && 'animate-spin')} />
            {githubSyncing ? 'Syncing…' : 'Sync GitHub'}
          </Button>
          <Button variant="subtle" onClick={() => setView('hub')}>
            <IconPlus className="h-4 w-4" /> Add a project
          </Button>
        </div>
      </div>
    </div>
  )

  if (total === 0) {
    return (
      <div className="rise-in mx-auto flex max-w-5xl flex-col gap-5">
        {heroBand}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="widget rounded-[16px] p-5">
            <div className="text-[22px]">⚡</div>
            <div className="mt-2 text-sm font-bold text-text">Sync GitHub</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              One click imports every repo you own or collaborate on, auto-sorted by what it is.
            </p>
          </div>
          <div className="widget rounded-[16px] p-5">
            <div className="text-[22px]">🛰️</div>
            <div className="mt-2 text-sm font-bold text-text">Shared board</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              You and Frankie see the same always-current view, refreshed every five minutes.
            </p>
          </div>
          <div className="widget rounded-[16px] p-5">
            <div className="text-[22px]">🌌</div>
            <div className="mt-2 text-sm font-bold text-text">Build from here</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Wizard, whiteboard, leads and inbox — the whole operation runs from this screen.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rise-in relative flex items-stretch gap-5">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {heroBand}

        {/* KPI row */}
        <div className="flex shrink-0 gap-4">
          <StatTile label="Projects" value={total} />
          <StatTile label="Shipped" value={shipped} tint="var(--green)" />
          <StatTile label="In progress" value={building} tint="var(--amber)" />
          <StatTile label="Avg level" value={avgLevel} sub={`of ${TOTAL_LEVELS}`} />
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
                        {CATEGORY_LABELS[p.category]}
                        {p.category === 'website' && ` · Level ${p.currentLevel}`}
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
                      {CATEGORY_LABELS[selected.category]}
                      {selected.category === 'website' &&
                        ` · Level ${selected.currentLevel} of ${TOTAL_LEVELS} · ${LEVELS[selected.currentLevel - 1].title}`}
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
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-[var(--ink-fg)]">
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
                  style={{
                    background: 'linear-gradient(135deg, #262c38 0%, #12151c 100%)',
                    border: '1px solid rgba(255,255,255,0.14)'
                  }}
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

