import { useEffect, useState } from 'react'
import { Card } from '../components/ui'
import { cn } from '../lib/util'
import { bridgeOnline, fetchStatus, fetchFleet, type BridgeStatus, type FleetSite } from '../lib/bridge'

function Dot({ ok }: { ok: boolean | null }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        ok === null ? 'bg-subtle' : ok ? 'bg-green shadow-[0_0_8px_rgba(62,230,168,.7)]' : 'bg-red shadow-[0_0_8px_rgba(255,107,139,.7)]'
      )}
    />
  )
}

function OfflineNote({ what }: { what: string }): React.JSX.Element {
  return (
    <p className="text-sm text-muted">
      {what} needs the local bridge — run <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-cyan">npm run dev</code>{' '}
      in <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-cyan">~/agentic-os/dashboard</code> on the Mac.
    </p>
  )
}

export function Ops(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [fleet, setFleet] = useState<FleetSite[] | null>(null)
  const [fleetAt, setFleetAt] = useState<number>(0)

  useEffect(() => {
    void (async () => {
      const f = await fetchFleet()
      if (f) { setFleet(f.sites); setFleetAt(f.checkedAt) }
      const ok = await bridgeOnline()
      setOnline(ok)
      if (ok) setStatus(await fetchStatus())
    })()
  }, [])

  return (
    <div className="rise-in mx-auto max-w-5xl space-y-5">
      <div>
        <p className="eyebrow mb-2">System</p>
        <h1 className="font-display text-2xl font-bold text-text">Operations</h1>
        <p className="mt-1 text-sm text-muted">
          Freight, Azure, and the live-site fleet — the work that pages you at 2am, on the board you look at every day.
        </p>
      </div>

      {/* Fleet — served by the shared backend, works everywhere */}
      <Card className="p-5" interactive={false}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-base font-semibold text-text">Live sites</h3>
          {fleetAt > 0 && (
            <span className="text-[11px] text-subtle">checked {new Date(fleetAt).toLocaleTimeString()}</span>
          )}
        </div>
        {fleet ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-white/[0.02] px-3.5 py-2.5">
                <Dot ok={s.ok} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{s.name}</div>
                  <div className="truncate text-[11px] text-subtle">{s.url.replace(/^https?:\/\//, '')}</div>
                </div>
                <span className="tnum text-[11px] font-medium text-muted">{s.ok ? `${s.ms}ms` : s.status || 'down'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Fleet data unavailable — backend unreachable.</p>
        )}
      </Card>

      {/* Freight — needs the local bridge (az CLI + vault) */}
      <Card className="p-5" interactive={false}>
        <div className="mb-3 flex items-center gap-2.5">
          <h3 className="font-display text-base font-semibold text-text">Freight</h3>
          <Dot ok={online} />
          <span className="text-[11px] text-subtle">{online === null ? 'checking bridge…' : online ? 'bridge online' : 'bridge offline'}</span>
        </div>
        {online === false && <OfflineNote what="Azure + Banyan status" />}
        {online && !status && <p className="text-sm text-muted">Collecting from az / vault…</p>}
        {status && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {status.freight.loggedIn ? (
                status.freight.apps.map((a) => (
                  <div key={a.app} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-white/[0.02] px-3.5 py-2.5">
                    <Dot ok={a.state === 'Running'} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-text">{a.label}</div>
                      <div className="truncate text-[11px] text-subtle">{a.app}</div>
                    </div>
                    <span className="text-[11px] font-medium text-muted">{a.state}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-amber">az not logged in on the Mac — freight status unavailable.</p>
              )}
              {status.freight.latestIncident && (
                <div className="rounded-[10px] border border-amber/25 bg-amber/10 px-3.5 py-2.5 text-[12.5px] text-amber">
                  Latest incident: {status.freight.latestIncident}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {status.freight.lastTriage && (
                <div className="rounded-[10px] border border-border bg-white/[0.02] px-3.5 py-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Last Banyan triage</div>
                  <div className="mt-1 text-[13px] text-text">
                    <span className={cn('font-semibold', status.freight.lastTriage.verdict.includes('ok') ? 'text-green' : 'text-amber')}>
                      {status.freight.lastTriage.verdict}
                    </span>{' '}
                    <span className="text-subtle">· {status.freight.lastTriage.when}</span>
                  </div>
                  {status.freight.lastTriage.note && <div className="mt-0.5 text-[12px] text-muted">{status.freight.lastTriage.note}</div>}
                </div>
              )}
              <div className="rounded-[10px] border border-border bg-white/[0.02] px-3.5 py-2.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Pulse</div>
                <div className="tnum mt-1 text-[13px] text-text">
                  {status.pulse.commits7} commits · 7d <span className="text-subtle">(velocity {status.pulse.velocity}/day)</span> · {status.pulse.runsTotal} skill runs logged
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Local repos (bridge) */}
      {status && (
        <Card className="p-5" interactive={false}>
          <h3 className="font-display mb-3 text-base font-semibold text-text">Working copies on the Mac</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {status.projects.map((p) => (
              <div key={p.name} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-white/[0.02] px-3.5 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {p.name} <span className="font-normal text-subtle">· {p.branch}</span>
                  </div>
                  <div className="truncate text-[11px] text-subtle">{p.date} — {p.msg}</div>
                </div>
                {p.dirty > 0 && (
                  <span className="tnum rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">{p.dirty} dirty</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
