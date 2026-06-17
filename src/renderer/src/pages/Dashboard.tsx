import { useStore } from '../store/useStore'
import { Card, StatusBadge, LevelPill, Button } from '../components/ui'
import { LEVELS, TOTAL_LEVELS } from '@shared/levels'
import { PROJECT_STATUSES, STATUS_LABELS } from '@shared/types'
import { relativeTime, ACCENT_VAR, openExternal } from '../lib/util'
import { SitePreview } from '../components/SitePreview'
import {
  IconWizard,
  IconProjects,
  IconCheck,
  IconDashboard,
  IconExternal,
  IconCode
} from '../components/icons'

function Stat({
  label,
  value,
  hint,
  color,
  Icon
}: {
  label: string
  value: string | number
  hint?: string
  color: string
  Icon: (p: { className?: string }) => React.JSX.Element
}): React.JSX.Element {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color, opacity: 0.85 }}
      />
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-muted">{label}</div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
    </Card>
  )
}

export function Dashboard(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const setView = useStore((s) => s.setView)
  const openProject = useStore((s) => s.openProject)
  const openStudio = useStore((s) => s.openStudio)

  const total = projects.length
  const shipped = projects.filter((p) => p.status === 'shipped').length
  const inProgress = projects.filter((p) => p.status === 'building' || p.status === 'review').length
  const avgLevel =
    total > 0 ? (projects.reduce((a, p) => a + p.currentLevel, 0) / total).toFixed(1) : '—'

  const perLevel = Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
    level: i + 1,
    title: LEVELS[i].title,
    count: projects.filter((p) => p.currentLevel === i + 1).length
  }))
  const maxPer = Math.max(1, ...perLevel.map((l) => l.count))

  const recent = [...projects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 5)
  const liveSites = projects.filter((p) => p.liveUrl).slice(0, 3)

  if (total === 0) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="bg-brand ring-brand mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white">
          <IconWizard className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-text">No sites yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Add your first website to start tracking it through the 7-level cookbook, or open the
          wizard to learn the process.
        </p>
        <div className="mt-5 flex gap-3">
          <Button onClick={() => setView('projects')}>Add a site</Button>
          <Button variant="subtle" onClick={() => setView('wizard')}>
            Open the wizard
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total sites" value={total} hint="being tracked" color="var(--accent)" Icon={IconProjects} />
        <Stat label="In progress" value={inProgress} hint="building or in review" color="var(--amber)" Icon={IconWizard} />
        <Stat label="Shipped" value={shipped} hint="live websites" color="var(--emerald)" Icon={IconCheck} />
        <Stat label="Avg. level" value={avgLevel} hint={`of ${TOTAL_LEVELS}`} color="var(--violet)" Icon={IconDashboard} />
      </div>

      {/* Live sites */}
      {liveSites.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text">Your live sites</h3>
            <button
              onClick={() => setView('projects')}
              className="text-xs font-medium text-accent hover:underline"
            >
              View all sites
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveSites.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-border bg-bg"
              >
                <div className="relative">
                  <SitePreview url={p.liveUrl} height={150} />
                  <button
                    onClick={() => openProject(p.id)}
                    className="absolute inset-0"
                    aria-label={`Open ${p.name}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="min-w-0 truncate text-sm font-medium text-text">{p.name}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(p.repoFullName || p.localPath) && (
                      <button
                        onClick={() => openStudio(p.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white transition hover:opacity-95"
                        title="Edit in Studio"
                      >
                        <IconCode className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => openExternal(p.liveUrl)}
                      className="text-subtle transition hover:text-accent"
                      title="Open live site"
                    >
                      <IconExternal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Projects per level */}
        <Card className="p-6 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-text">Sites by level</h3>
            <button
              onClick={() => setView('wizard')}
              className="text-xs font-medium text-accent hover:underline"
            >
              View the 7 levels
            </button>
          </div>
          <div className="space-y-3">
            {perLevel.map((l) => (
              <div key={l.level} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs text-muted">
                  <span className="font-semibold text-text">L{l.level}</span> {l.title}
                </div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(l.count / maxPer) * 100}%`,
                      background: ACCENT_VAR[LEVELS[l.level - 1].accent] ?? 'var(--accent)'
                    }}
                  />
                </div>
                <div className="w-6 text-right text-xs font-semibold text-text">{l.count}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Status breakdown */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-5 font-semibold text-text">By status</h3>
          <div className="space-y-3">
            {PROJECT_STATUSES.map((status) => {
              const count = projects.filter((p) => p.status === status).length
              return (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-semibold text-text">{count}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs text-muted">
            {STATUS_LABELS.shipped}: {shipped} of {total} ·{' '}
            {total > 0 ? Math.round((shipped / total) * 100) : 0}% complete
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="p-6">
        <h3 className="mb-4 font-semibold text-text">Recently opened</h3>
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="pb-3 font-medium">Site</th>
                <th className="pb-3 font-medium">Level</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Last opened</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="cursor-pointer border-t border-border transition hover:bg-bg"
                >
                  <td className="py-3 font-medium text-text">{p.name}</td>
                  <td className="py-3">
                    <LevelPill level={p.currentLevel} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3 text-right text-muted">{relativeTime(p.lastOpenedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
