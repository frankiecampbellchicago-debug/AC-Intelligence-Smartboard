import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui'
import { cn } from '../lib/util'
import {
  bridgeOnline, fetchStatus, fetchFleet, fetchVaultTree, fetchVaultFile, fetchBrainFeed,
  type BridgeStatus, type FleetSite, type VaultNode, type BrainEvent
} from '../lib/bridge'

/* Aurora particle brain — the center of the system. */
function Orb({ notes, size = 300 }: { notes: number; size?: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = (canvas.width = size)
    const H = (canvas.height = size)
    const N = Math.min(420, 110 + notes * 3)
    const R = size * 0.32
    const pts = [...Array(N)].map(() => {
      const t = Math.acos(2 * Math.random() - 1)
      const p = Math.random() * Math.PI * 2
      return { t, p, r: R + Math.random() * (size * 0.06), s: 0.6 + Math.random() * 1.7 }
    })
    let raf = 0, a = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (): void => {
      a += 0.0035
      ctx.clearRect(0, 0, W, H)
      for (const pt of pts) {
        const x3 = pt.r * Math.sin(pt.t) * Math.cos(pt.p + a)
        const z3 = pt.r * Math.sin(pt.t) * Math.sin(pt.p + a)
        const y3 = pt.r * Math.cos(pt.t)
        const depth = (z3 + pt.r) / (2 * pt.r)
        const hue = depth > 0.6 ? '167,155,255' : depth > 0.3 ? '213,122,232' : '127,227,240'
        ctx.beginPath()
        ctx.arc(W / 2 + x3, H / 2 + y3 * 0.92, pt.s * (0.5 + depth), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hue},${0.22 + depth * 0.66})`
        ctx.fill()
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [notes, size])
  return <canvas ref={ref} className="mx-auto block" style={{ width: size, height: size }} aria-hidden="true" />
}

function Dot({ ok }: { ok: boolean | null }): React.JSX.Element {
  return <span className={cn('inline-block h-2 w-2 rounded-full', ok === null ? 'bg-subtle' : ok ? 'bg-green shadow-[0_0_8px_rgba(62,230,168,.7)]' : 'bg-red shadow-[0_0_8px_rgba(255,107,139,.7)]')} />
}

function PanelTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">{children}</div>
}

function Tree({ nodes, onOpen, depth = 0 }: { nodes: VaultNode[]; onOpen: (p: string) => void; depth?: number }): React.JSX.Element {
  return (
    <div className={cn(depth > 0 && 'ml-2.5 border-l border-border pl-2')}>
      {nodes.map((n) =>
        n.type === 'dir' ? (
          <details key={n.path}>
            <summary className="cursor-pointer select-none py-0.5 text-[12.5px] font-semibold text-muted hover:text-text">{n.name}/</summary>
            <Tree nodes={n.children ?? []} onOpen={onOpen} depth={depth + 1} />
          </details>
        ) : (
          <button key={n.path} onClick={() => onOpen(n.path)} className="block w-full truncate rounded px-1 py-0.5 text-left text-[12px] text-subtle transition hover:bg-accent-soft hover:text-text">
            {n.name}
          </button>
        )
      )}
    </div>
  )
}

export function Ops(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [fleet, setFleet] = useState<FleetSite[] | null>(null)
  const [notes, setNotes] = useState(0)
  const [tree, setTree] = useState<VaultNode[]>([])
  const [file, setFile] = useState<{ path: string; content: string } | null>(null)
  const [feed, setFeed] = useState<{ active: boolean; events: BrainEvent[] } | null>(null)

  useEffect(() => {
    let stop = false
    const tick = async (): Promise<void> => {
      const f = await fetchBrainFeed()
      if (!stop && f) setFeed(f)
    }
    void tick()
    const iv = setInterval(() => void tick(), 5000)
    return () => { stop = true; clearInterval(iv) }
  }, [])

  useEffect(() => {
    void (async () => {
      void fetchFleet().then((f) => f && setFleet(f.sites))
      const ok = await bridgeOnline()
      setOnline(ok)
      if (ok) {
        void fetchStatus().then(setStatus)
        void fetchVaultTree().then((t) => { if (t) { setTree(t.tree); setNotes(t.notes) } })
      }
    })()
  }, [])

  return (
    <div className="rise-in mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">AC Intelligence</p>
          <h1 className="font-display text-2xl font-bold text-text">Operations System</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-subtle"><Dot ok={online} />{online === null ? 'linking…' : online ? 'bridge online' : 'bridge offline'}</div>
      </div>

      {/* HUD: brain center, systems around it */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Left rail */}
        <div className="space-y-4">
          <Card className="p-4" interactive={false}>
            <PanelTitle>Live sites</PanelTitle>
            {fleet ? fleet.map((s) => (
              <div key={s.name} className="flex items-center gap-2 py-1">
                <Dot ok={s.ok} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text">{s.name}</span>
                <span className="tnum text-[10.5px] text-subtle">{s.ok ? `${s.ms}ms` : 'down'}</span>
              </div>
            )) : <p className="text-[12px] text-subtle">backend unreachable</p>}
          </Card>
          <Card className="p-4" interactive={false}>
            <PanelTitle>Pulse</PanelTitle>
            {status ? (
              <>
                <div className="tnum font-display text-[26px] font-bold leading-none text-text">{status.pulse.commits7}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">commits · 7d</div>
                <div className="mt-2 flex h-8 items-end gap-[3px]">
                  {status.pulse.commitsPerDay.map((c, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[var(--brand-from)] to-[var(--brand-to)]" style={{ height: `${Math.max(8, (c / Math.max(1, ...status.pulse.commitsPerDay)) * 100)}%`, opacity: 0.35 + (c ? 0.65 : 0) }} />
                  ))}
                </div>
                <div className="tnum mt-2 text-[11px] text-muted">{status.pulse.runsTotal} skill runs logged</div>
              </>
            ) : <p className="text-[12px] text-subtle">{online ? 'collecting…' : 'needs bridge'}</p>}
          </Card>
        </div>

        {/* Brain center — a live look inside Claude Code */}
        <Card className="flex flex-col items-center p-4 lg:col-span-2" interactive={false}>
          <div className="mb-1 flex items-center gap-2 self-start">
            <Dot ok={feed?.active ?? null} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">
              {feed?.active ? 'Claude active' : 'Claude idle'}
            </span>
          </div>
          <Orb notes={notes || 23} />
          <div className="-mt-2 mb-2 text-center">
            <span className="tnum font-display text-lg font-bold text-text">{notes}</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle">notes in the vault</span>
          </div>
          <div className="w-full space-y-1 border-t border-border pt-2">
            {(feed?.events ?? []).slice(-5).map((e, i) => (
              <div key={i} className="flex items-center gap-2 truncate text-[11px]">
                <span className="tnum shrink-0 text-subtle">{e.t}</span>
                <span className={cn('shrink-0 font-bold uppercase tracking-wide', e.kind === 'tool' ? 'text-cyan' : e.kind === 'user' ? 'text-accent' : 'text-subtle')}>
                  {e.kind}
                </span>
                <span className="truncate text-muted">{e.label}</span>
              </div>
            ))}
            {!feed?.events?.length && <div className="text-center text-[11px] text-subtle">no recent activity</div>}
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="p-4" interactive={false}>
            <PanelTitle>Freight</PanelTitle>
            {status?.freight.loggedIn ? status.freight.apps.map((a) => (
              <div key={a.app} className="flex items-center gap-2 py-1">
                <Dot ok={a.state === 'Running'} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text">{a.label}</span>
                <span className="text-[10.5px] text-subtle">{a.state}</span>
              </div>
            )) : <p className="text-[12px] text-subtle">{online ? 'az not logged in' : 'needs bridge'}</p>}
            {status?.freight.lastTriage && (
              <div className="mt-2 border-t border-border pt-2 text-[11.5px] text-muted">
                triage <span className={cn('font-semibold', status.freight.lastTriage.verdict.includes('ok') ? 'text-green' : 'text-amber')}>{status.freight.lastTriage.verdict}</span> · {status.freight.lastTriage.when.slice(0, 10)}
              </div>
            )}
          </Card>
          <Card className="p-4" interactive={false}>
            <PanelTitle>Activity</PanelTitle>
            {status ? (
              <div className="space-y-1.5">
                {status.claude.wip.slice(0, 2).map((w) => (
                  <div key={w.project} className="truncate text-[11.5px] text-muted"><span className="font-semibold text-text">{w.project}</span> · wip</div>
                ))}
                {status.claude.runs.slice(0, 4).map((r, i) => (
                  <div key={i} className="truncate text-[11.5px] text-muted"><span className="text-accent">{r.skill}</span> {r.verdict} · {r.when.slice(5, 10)}</div>
                ))}
              </div>
            ) : <p className="text-[12px] text-subtle">{online ? 'collecting…' : 'needs bridge'}</p>}
          </Card>
        </div>
      </div>

      {/* Vault access below the HUD */}
      {online && (
        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="max-h-[300px] overflow-y-auto p-4" interactive={false}>
            <PanelTitle>Vault</PanelTitle>
            <Tree nodes={tree} onOpen={(p) => void fetchVaultFile(p).then((f) => f && setFile(f))} />
          </Card>
          <Card className="p-4 lg:col-span-3" interactive={false}>
            {file ? (
              <>
                <div className="mb-2 border-b border-border pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">{file.path}</div>
                <pre className="max-h-[248px] overflow-auto whitespace-pre-wrap font-[ui-monospace,Menlo,monospace] text-[12px] leading-relaxed text-muted">{file.content}</pre>
              </>
            ) : <div className="flex h-full min-h-[100px] items-center justify-center text-[12.5px] text-subtle">Open a note from the vault.</div>}
          </Card>
        </div>
      )}
      {online === false && (
        <Card className="p-4" interactive={false}>
          <p className="text-[12.5px] text-muted">Vault, freight and pulse need the bridge on the Mac — it auto-starts at login (launchd), or run <code className="rounded bg-white/[0.06] px-1 text-[11px] text-cyan">node ~/agentic-os/dashboard/server.mjs</code>.</p>
        </Card>
      )}
    </div>
  )
}
