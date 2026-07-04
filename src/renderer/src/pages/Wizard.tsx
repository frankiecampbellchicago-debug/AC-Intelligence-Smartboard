import { LEVELS, type Level } from '@shared/levels'
import { Card } from '../components/ui'
import { openExternal, ACCENT_VAR } from '../lib/util'
import { IconExternal, IconAlert, IconCheck } from '../components/icons'

function LevelCard({ level }: { level: Level }): React.JSX.Element {
  const accent = ACCENT_VAR[level.accent] ?? 'var(--accent)'
  return (
    <Card className="relative overflow-hidden p-6">
      {/* accent rail */}
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="flex items-start gap-4 pl-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{ background: accent }}
        >
          {level.number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-bold text-text">{level.title}</h3>
            <span className="text-sm italic text-muted">“{level.tagline}”</span>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {/* You're here when */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                You're here when
              </div>
              <ul className="space-y-1.5">
                {level.hereWhen.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-text">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills to master */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                Skills to master
              </div>
              <ul className="space-y-1.5">
                {level.skills.map((s) => (
                  <li key={s.id} className="flex gap-2 text-sm text-text">
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-strong text-transparent"
                    >
                      <IconCheck className="h-3 w-3" />
                    </span>
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trap */}
          <div className="mt-4 flex gap-2.5 rounded-xl border border-red/20 bg-red/5 p-3">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-red" />
            <div className="text-sm">
              <span className="font-semibold text-red">Trap — {level.trap.name}:</span>{' '}
              <span className="text-text">{level.trap.description}</span>
            </div>
          </div>

          {level.tip && (
            <div className="mt-3 rounded-lg bg-bg px-3 py-2 font-mono text-xs text-muted">
              💡 {level.tip}
            </div>
          )}

          {/* Resources */}
          {level.resources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {level.resources.map((r) => (
                <button
                  key={r.url}
                  onClick={() => openExternal(r.url)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-border-strong hover:text-accent"
                >
                  {r.label}
                  <IconExternal className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* Unlock */}
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <span className="font-semibold" style={{ color: accent }}>
              Unlock →
            </span>{' '}
            <span className="text-muted">{level.unlock}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function Wizard(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="relative overflow-hidden rounded-[14px] border border-border bg-surface p-6">
        {/* Faint moonlight bloom — the brand's quiet decoration. */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.06] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-40 w-40 rounded-full bg-[var(--violet)] opacity-[0.08] blur-2xl" />
        <div className="relative">
          <p className="eyebrow mb-2">The Method</p>
          <h2 className="font-display text-xl font-bold text-text">The Website Cookbook</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Seven levels from “just a prompt” to a shipped, search-optimized site. Master each
            level, avoid its trap, and unlock the next.
          </p>
        </div>
      </div>
      {LEVELS.map((level) => (
        <LevelCard key={level.number} level={level} />
      ))}
    </div>
  )
}
