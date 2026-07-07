import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/util'
import {
  bridgeOnline, fetchStatus, fetchFleet, fetchVaultTree, fetchBrainFeed, fetchSessions,
  type BridgeStatus, type FleetSite, type BrainEvent, type SessionRow
} from '../lib/bridge'

/* ============================================================
   THE HUB — one boxless surface. The brain at center is the
   real mind of the OS: neurons, synapses, live thought-feed.
   ============================================================ */

const SUBS = [
  { name: 'Claude Max', cost: 100 },
  { name: 'Gemini Pro', cost: 20 },
  { name: 'Perplexity Pro', cost: 20 }
]

async function getLifetime(): Promise<{ msgs: number; hours: number; sessions: number } | null> {
  try {
    const r = await fetch('http://localhost:5177/api/hub/lifetime', { signal: AbortSignal.timeout(120000) })
    return r.ok ? await r.json() : null
  } catch { return null }
}
async function gradeAll(): Promise<{ running: boolean; done: number; total: number } | null> {
  try {
    const r = await fetch('http://localhost:5177/api/hub/grade-all', { method: 'POST', signal: AbortSignal.timeout(8000) })
    return r.ok ? await r.json() : null
  } catch { return null }
}

/* Neural brain — neurons, synapses, firing pulses; tempo follows live activity. */
function Brain({ notes, active, tempo }: { notes: number; active: boolean; tempo: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const stR = useRef({ active, tempo })
  stR.current = { active, tempo }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const S = 460
    canvas.width = S; canvas.height = S
    const N = Math.min(150, 70 + notes * 2)
    const R = S * 0.3
    const pts = [...Array(N)].map(() => {
      const t = Math.acos(2 * Math.random() - 1), p = Math.random() * Math.PI * 2
      return { t, p, r: R * (0.55 + Math.random() * 0.45), s: 0.8 + Math.random() * 1.8, ph: Math.random() * Math.PI * 2 }
    })
    interface Pulse { a: number; b: number; k: number }
    let pulses: Pulse[] = []
    let raf = 0, a = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const proj = (pt: (typeof pts)[0], ang: number): [number, number, number] => {
      const x3 = pt.r * Math.sin(pt.t) * Math.cos(pt.p + ang)
      const z3 = pt.r * Math.sin(pt.t) * Math.sin(pt.p + ang)
      const y3 = pt.r * Math.cos(pt.t)
      return [S / 2 + x3, S / 2 + y3 * 0.9, (z3 + pt.r) / (2 * pt.r)]
    }
    const draw = (): void => {
      const { active: act, tempo: tp } = stR.current
      a += 0.0028 * (act ? 1.8 : 1)
      ctx.clearRect(0, 0, S, S)
      const P = pts.map((pt) => proj(pt, a))
      /* synapses between near neurons */
      ctx.lineWidth = 0.6
      for (let i = 0; i < N; i += 2) for (let j = i + 1; j < Math.min(i + 14, N); j++) {
        const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d2 = dx * dx + dy * dy
        if (d2 < 2600) {
          const o = (1 - d2 / 2600) * 0.22 * (P[i][2] + P[j][2])
          ctx.strokeStyle = `rgba(150,140,255,${o})`
          ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke()
        }
      }
      /* firing pulses along random synapses */
      if (!reduced && Math.random() < (act ? 0.3 : 0.08) * Math.min(2, tp + 0.5)) {
        pulses.push({ a: Math.floor(Math.random() * N), b: Math.floor(Math.random() * N), k: 0 })
      }
      pulses = pulses.filter((pl) => pl.k < 1)
      for (const pl of pulses) {
        pl.k += 0.045
        const x = P[pl.a][0] + (P[pl.b][0] - P[pl.a][0]) * pl.k
        const y = P[pl.a][1] + (P[pl.b][1] - P[pl.a][1]) * pl.k
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7)
        g.addColorStop(0, 'rgba(213,122,232,.9)'); g.addColorStop(1, 'rgba(213,122,232,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
      }
      /* neurons — breathing */
      for (let i = 0; i < N; i++) {
        const [x, y, depth] = P[i]
        const breathe = 1 + 0.25 * Math.sin(a * 30 + pts[i].ph)
        const hue = depth > 0.62 ? '167,155,255' : depth > 0.3 ? '213,122,232' : '127,227,240'
        ctx.beginPath(); ctx.arc(x, y, pts[i].s * (0.5 + depth) * breathe, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hue},${0.25 + depth * 0.65})`; ctx.fill()
      }
      /* core glow */
      const cg = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, R * 0.55)
      cg.addColorStop(0, `rgba(140,110,255,${act ? 0.16 : 0.08})`); cg.addColorStop(1, 'rgba(140,110,255,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(S / 2, S / 2, R * 0.55, 0, Math.PI * 2); ctx.fill()
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [notes])
  return <canvas ref={ref} style={{ width: 460, height: 460, maxWidth: '90vw' }} aria-hidden="true" />
}

function Stat({ label, value, sub, tint }: { label: string; value: string; sub?: string; tint?: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">{label}</div>
      <div className="font-display tnum mt-1 text-[34px] font-bold leading-none" style={{ color: tint || 'var(--text)' }}>{value}</div>
      {sub && <div className="mt-1 text-[11.5px] text-muted">{sub}</div>}
    </div>
  )
}

export function Ops(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [fleet, setFleet] = useState<FleetSite[] | null>(null)
  const [notes, setNotes] = useState(0)
  const [life, setLife] = useState<{ msgs: number; hours: number; sessions: number } | null>(null)
  const [rows, setRows] = useState<SessionRow[]>([])
  const [gp, setGp] = useState<{ running: boolean; done: number; total: number } | null>(null)
  const [feed, setFeed] = useState<{ active: boolean; events: BrainEvent[] } | null>(null)

  useEffect(() => {
    let stop = false
    const tick = async (): Promise<void> => { const f = await fetchBrainFeed(); if (!stop && f) setFeed(f) }
    void tick(); const iv = setInterval(() => void tick(), 5000)
    return () => { stop = true; clearInterval(iv) }
  }, [])

  useEffect(() => {
    void (async () => {
      void fetchFleet().then((f) => f && setFleet(f.sites))
      const ok = await bridgeOnline()
      setOnline(ok)
      if (!ok) return
      void fetchStatus().then(setStatus)
      void fetchVaultTree().then((t) => t && setNotes(t.notes))
      void getLifetime().then(setLife)
      void gradeAll().then(setGp)
      const load = async (): Promise<void> => { const d = await fetchSessions(); if (d) setRows(d.sessions) }
      void load()
      const iv = setInterval(() => { void load(); void gradeAll().then(setGp) }, 30000)
      return () => clearInterval(iv)
    })()
  }, [])

  const graded = rows.filter((r) => r.grade)
  const avg = graded.length ? Math.round((graded.reduce((a, r) => a + (r.grade?.score ?? 0), 0) / graded.length) * 10) / 10 : null
  const athenaSpend = (() => { try { const l = JSON.parse(localStorage.getItem('athena-costs') || '{}'); return l[new Date().toISOString().slice(0, 7)] || 0 } catch { return 0 } })()
  const subTotal = SUBS.reduce((a, s) => a + s.cost, 0)
  const runs = status?.pulse.runsTotal ?? 0
  const savedHours = Math.round(runs * 0.25 * 10) / 10

  return (
    <div className="rise-in relative mx-auto min-h-full max-w-6xl px-8 pb-10 pt-6">
      {/* crown line */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow mb-1.5">AC Intelligence</p>
          <h1 className="font-display text-[26px] font-bold text-text">Operations System</h1>
        </div>
        <div className="text-[11px] tracking-[0.14em] text-subtle">
          {online === null ? 'LINKING…' : online ? '◉ BRIDGE ONLINE' : '○ BRIDGE OFFLINE'} · {feed?.active ? 'CLAUDE ACTIVE' : 'CLAUDE IDLE'}
        </div>
      </div>

      {/* ring of stats around the brain — no boxes, one surface */}
      <div className="mt-2 grid items-center gap-x-10 gap-y-8" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* left column */}
        <div className="flex flex-col gap-9 justify-self-end text-right">
          <Stat label="Lifetime with Claude" value={life ? life.msgs.toLocaleString() : '—'} sub={life ? `messages · ${life.sessions} sessions` : online ? 'counting…' : 'needs bridge'} />
          <Stat label="Time in session" value={life ? `${Math.round(life.hours).toLocaleString()}h` : '—'} sub="total session hours" />
          <Stat label="Claude grade" value={avg !== null ? `${avg}/10` : '—'} tint={avg !== null ? (avg >= 8 ? 'var(--green)' : avg >= 5 ? 'var(--amber)' : 'var(--red)') : undefined}
            sub={gp?.running ? `auto-grading ${gp.done}/${gp.total}…` : `${graded.length} sessions graded`} />
        </div>

        {/* THE BRAIN — unboxed, alive */}
        <div className="relative flex flex-col items-center">
          <Brain notes={notes || 23} active={feed?.active ?? false} tempo={(feed?.events.length ?? 0) / 6} />
          <div className="-mt-6 text-center">
            <span className="tnum font-display text-lg font-bold text-text">{notes}</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-[0.2em] text-subtle">memories</span>
          </div>
          {/* live thought-feed */}
          <div className="mt-3 w-[430px] max-w-[86vw] space-y-1">
            {(feed?.events ?? []).slice(-3).map((e, i) => (
              <div key={i} className="flex items-center gap-2 truncate text-[11px] opacity-80">
                <span className="tnum shrink-0 text-subtle">{e.t}</span>
                <span className={cn('shrink-0 font-bold uppercase', e.kind === 'tool' ? 'text-cyan' : e.kind === 'user' ? 'text-accent' : 'text-subtle')}>{e.kind}</span>
                <span className="truncate text-muted">{e.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-9 justify-self-start">
          <Stat label="AI spend / month" value={`$${(subTotal + athenaSpend).toFixed(0)}`}
            sub={`${SUBS.map((s) => `${s.name} $${s.cost}`).join(' · ')} · Athena $${athenaSpend.toFixed(2)}`} />
          <Stat label="Skill runs" value={String(runs)} sub={`across the agentic OS`} />
          <Stat label="Est. time saved" value={`${savedHours}h`} sub={`skills automation · ≈$${Math.round(savedHours * 60).toLocaleString()} at $60/h`} tint="var(--green)" />
        </div>
      </div>

      {/* live sites — a single quiet line, no boxes */}
      <div className="mt-10 border-t border-border pt-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">Live sites</div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {fleet ? fleet.map((s) => (
            <span key={s.name} className="flex items-center gap-2 text-[13px]">
              <span className={cn('inline-block h-2 w-2 rounded-full', s.ok ? 'bg-green shadow-[0_0_8px_rgba(62,230,168,.7)]' : 'bg-red shadow-[0_0_8px_rgba(255,107,139,.7)]')} />
              <span className="font-medium text-text">{s.name}</span>
              <span className="tnum text-[11px] text-subtle">{s.ok ? `${s.ms}ms` : 'down'}</span>
            </span>
          )) : <span className="text-[12px] text-subtle">backend unreachable</span>}
        </div>
      </div>
    </div>
  )
}
