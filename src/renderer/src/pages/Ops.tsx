import { useEffect, useRef, useState } from 'react'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import { cn } from '../lib/util'
import {
  bridgeOnline, fetchStatus, fetchFleet, fetchVaultTree, fetchBrainFeed, fetchSessions,
  fetchCommands, fetchJobs, runCommand,
  type BridgeStatus, type FleetSite, type BrainEvent, type SessionRow, type DeckCommand, type DeckJob
} from '../lib/bridge'

/* ============================================================
   OPERATIONS SYSTEM — V.A.U.L.T.-class HUD. One surface, no
   boxes: vitals rail left, living brain center over the grid,
   command deck right, primary metric huge beneath the mind.
   ============================================================ */

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
const SUBS = [
  { name: 'CLAUDE MAX', cost: 100 },
  { name: 'GEMINI PRO', cost: 20 },
  { name: 'PERPLEXITY', cost: 20 }
]

async function getLifetime(): Promise<{ msgs: number; hours: number; sessions: number } | null> {
  try { const r = await fetch('http://localhost:5177/api/hub/lifetime', { signal: AbortSignal.timeout(120000) }); return r.ok ? await r.json() : null } catch { return null }
}
async function gradeAll(): Promise<{ running: boolean; done: number; total: number } | null> {
  try { const r = await fetch('http://localhost:5177/api/hub/grade-all', { method: 'POST', signal: AbortSignal.timeout(8000) }); return r.ok ? await r.json() : null } catch { return null }
}

function Spark({ data, w = 190, h = 26 }: { data: number[]; w?: number; h?: number }): React.JSX.Element {
  const max = Math.max(1, ...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="rgba(150,140,255,.75)" strokeWidth="1.2" />
    </svg>
  )
}

/* Neural brain — synapses, firing pulses, tempo follows live Claude activity. */
function Brain({ notes, active, tempo }: { notes: number; active: boolean; tempo: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const stR = useRef({ active, tempo })
  stR.current = { active, tempo }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const S = 520
    canvas.width = S; canvas.height = S
    const N = Math.min(170, 80 + notes * 2)
    const R = S * 0.31
    const pts = [...Array(N)].map(() => {
      const t = Math.acos(2 * Math.random() - 1), p = Math.random() * Math.PI * 2
      return { t, p, r: R * (0.5 + Math.random() * 0.5), s: 0.8 + Math.random() * 1.8, ph: Math.random() * Math.PI * 2 }
    })
    interface Pulse { a: number; b: number; k: number }
    let pulses: Pulse[] = []
    let raf = 0, a = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const proj = (pt: (typeof pts)[0], ang: number): [number, number, number] => {
      const x3 = pt.r * Math.sin(pt.t) * Math.cos(pt.p + ang)
      const z3 = pt.r * Math.sin(pt.t) * Math.sin(pt.p + ang)
      const y3 = pt.r * Math.cos(pt.t)
      return [S / 2 + x3, S / 2 + y3 * 0.92, (z3 + pt.r) / (2 * pt.r)]
    }
    const draw = (): void => {
      const { active: act, tempo: tp } = stR.current
      a += 0.0026 * (act ? 1.9 : 1)
      ctx.clearRect(0, 0, S, S)
      const P = pts.map((pt) => proj(pt, a))
      ctx.lineWidth = 0.6
      for (let i = 0; i < N; i += 2) for (let j = i + 1; j < Math.min(i + 15, N); j++) {
        const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d2 = dx * dx + dy * dy
        if (d2 < 2800) {
          const o = (1 - d2 / 2800) * 0.24 * (P[i][2] + P[j][2])
          ctx.strokeStyle = `rgba(150,140,255,${o})`
          ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke()
        }
      }
      if (!reduced && Math.random() < (act ? 0.32 : 0.09) * Math.min(2, tp + 0.5)) {
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
      for (let i = 0; i < N; i++) {
        const [x, y, depth] = P[i]
        const breathe = 1 + 0.25 * Math.sin(a * 30 + pts[i].ph)
        const hue = depth > 0.62 ? '167,155,255' : depth > 0.3 ? '213,122,232' : '190,200,255'
        ctx.beginPath(); ctx.arc(x, y, pts[i].s * (0.5 + depth) * breathe, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hue},${0.25 + depth * 0.68})`; ctx.fill()
      }
      const cg = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, R * 0.6)
      cg.addColorStop(0, `rgba(140,110,255,${act ? 0.17 : 0.08})`); cg.addColorStop(1, 'rgba(140,110,255,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(S / 2, S / 2, R * 0.6, 0, Math.PI * 2); ctx.fill()
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [notes])
  return <canvas ref={ref} style={{ width: 520, height: 520, maxWidth: '46vw' }} aria-hidden="true" />
}

function Rule({ label, tag }: { label: string; tag?: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 10, letterSpacing: '.28em', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
      {tag && <span style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--text-subtle)' }}>{tag}</span>}
      <span style={{ flex: 1, borderTop: '1px dashed rgba(150,140,255,.2)' }} />
    </div>
  )
}

function Vital({ label, delta, value, series }: { label: string; delta?: string; value: string; series?: number[] }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '.18em', color: 'var(--text-subtle)' }}>
        <span>• {label}</span>{delta && <span style={{ color: 'var(--accent)' }}>{delta}</span>}
      </div>
      <div className="tnum" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, color: 'var(--text)' }}>{value}</div>
      {series && series.length > 1 && <Spark data={series} />}
    </div>
  )
}

function Clock(): React.JSX.Element {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv) }, [])
  const hm = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  const s = now.toLocaleTimeString('en-US', { hour12: false, second: '2-digit' }).slice(-2)
  return (
    <div style={{ textAlign: 'right' }}>
      <span className="tnum" style={{ fontSize: 44, fontWeight: 700, color: 'var(--text)' }}>{hm}</span>
      <span className="tnum" style={{ fontSize: 44, fontWeight: 700, color: 'var(--accent)' }}>:{s}</span>
      <div style={{ fontSize: 10, letterSpacing: '.34em', color: 'var(--text-subtle)' }}>
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' }).toUpperCase()}
      </div>
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
  const [cmds, setCmds] = useState<DeckCommand[]>([])
  const [jobs, setJobs] = useState<DeckJob[]>([])

  useEffect(() => {
    let stop = false
    const tick = async (): Promise<void> => {
      const f = await fetchBrainFeed(); if (!stop && f) setFeed(f)
      const j = await fetchJobs(); if (!stop && j) setJobs(j)
    }
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
      void fetchCommands().then((c) => c && setCmds(c))
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
  const running = jobs.find((j) => j.status === 'running')
  const upSites = fleet?.filter((s) => s.ok).length ?? 0

  return (
    <div className="rise-in" style={{ fontFamily: MONO, minHeight: '100%', position: 'relative', padding: '18px 28px 34px' }}>
      {/* grid floor behind the brain */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '30%', height: '46%', zIndex: -1, opacity: .16,
        backgroundImage: 'linear-gradient(rgba(150,140,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(150,140,255,.5) 1px, transparent 1px)',
        backgroundSize: '46px 46px', transform: 'perspective(600px) rotateX(58deg)', maskImage: 'radial-gradient(ellipse 60% 80% at 50% 40%, black, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 40%, black, transparent 75%)' }} />

      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '.42em', color: 'var(--text)' }}>A.C.O.S.</div>
          <div style={{ fontSize: 9.5, letterSpacing: '.3em', color: 'var(--text-subtle)' }}>AMARO·CAMPBELL OPERATIONS SYSTEM</div>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '.24em', color: 'var(--text-muted)', paddingTop: 14 }}>
          <span style={{ color: feed?.active ? 'var(--green)' : 'var(--text-subtle)' }}>• CORE · {feed?.active ? 'ACTIVE' : 'IDLE'}</span>
          <span style={{ margin: '0 18px', color: online ? 'var(--accent)' : 'var(--red)' }}>LINK · {online ? 'ONLINE' : 'OFFLINE'}</span>
          <span style={{ color: gp?.running ? 'var(--amber)' : 'var(--text-subtle)' }}>COACH · {gp?.running ? `GRADING ${gp.done}/${gp.total}` : 'ALIVE'}</span>
        </div>
        <Clock />
      </div>

      {/* main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: 24, marginTop: 10 }}>
        {/* LEFT — SYSTEM VITALS */}
        <div>
          <Rule label="SYSTEM VITALS" tag="CLAUDE.LINK" />
          <Vital label="LIFETIME CHATS" value={life ? life.msgs.toLocaleString() : '—'} delta={life ? `${life.sessions} SESSIONS` : undefined} />
          <Vital label="TIME IN SESSION" value={life ? `${Math.round(life.hours).toLocaleString()}H` : '—'} />
          <Vital label="AI SPEND / MO" value={`$${(subTotal + athenaSpend).toFixed(0)}`} delta={`ATHENA $${athenaSpend.toFixed(2)}`} />
          <div style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--text-subtle)', marginTop: -14, marginBottom: 20 }}>
            {SUBS.map((s) => `${s.name} $${s.cost}`).join(' · ')}
          </div>
          <Vital label="SKILL RUNS" value={String(runs)} delta={`≈${savedHours}H SAVED`} series={status?.pulse.runsPerDay} />

          <Rule label="DIRECTIVES" tag="WIP.TOP" />
          {(status?.claude.wip ?? []).slice(0, 3).map((w) => (
            <div key={w.project} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 9, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-subtle)' }}>▢</span>
              <span><b style={{ color: 'var(--text)' }}>{w.project}</b> — {w.head.replace(/[#*`\n-]/g, ' ').slice(0, 72)}</span>
            </div>
          ))}
          {!status?.claude.wip?.length && <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>no active directives</div>}
        </div>

        {/* CENTER — THE MIND */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Brain notes={notes || 23} active={feed?.active ?? false} tempo={(feed?.events.length ?? 0) / 6} />
          <div style={{ marginTop: -30, textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '.3em', color: 'var(--text-muted)' }}>PRIMARY DIRECTIVE · CLAUDE MASTERY</div>
            <div className="tnum" style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, color: 'var(--text)' }}>
              {avg !== null ? avg.toFixed(1) : '—'}<span style={{ fontSize: 22, color: 'var(--text-muted)', letterSpacing: '.2em' }}> /10</span>
            </div>
            <div style={{ width: 330, height: 3, background: 'rgba(150,140,255,.15)', margin: '10px auto 8px', borderRadius: 2 }}>
              <div style={{ width: `${((avg ?? 0) / 10) * 100}%`, height: '100%', background: 'linear-gradient(90deg,var(--brand-from),var(--brand-to))', borderRadius: 2, boxShadow: '0 0 12px rgba(140,100,255,.6)' }} />
            </div>
            <div className="tnum" style={{ fontSize: 10.5, letterSpacing: '.2em', color: 'var(--text-muted)' }}>
              GRADED {graded.length}/{rows.length || '—'} · MEMORIES {notes} · SITES {upSites}/{fleet?.length ?? '—'} UP
            </div>
            {feed?.events.length ? (
              <div style={{ fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 10, letterSpacing: '.06em' }}>
                latest thought — <span style={{ color: 'var(--cyan)' }}>{feed.events[feed.events.length - 1].label.slice(0, 76)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT — COMMAND DECK + SITES + TRAIL */}
        <div>
          <Rule label="COMMAND DECK" tag={running ? `RUNNING · ${running.key.toUpperCase()}` : 'IDLE'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 10px', marginBottom: 6 }}>
            {cmds.map((c) => (
              <button key={c.key} onClick={() => void runCommand(c.key).then(() => fetchJobs().then((j) => j && setJobs(j)))}
                disabled={!!running}
                style={{ background: 'transparent', border: 0, textAlign: 'left', cursor: running ? 'wait' : 'pointer', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: running?.key === c.key ? 'var(--amber)' : 'var(--text-muted)', padding: 0 }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--accent)' }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = running?.key === c.key ? 'var(--amber)' : 'var(--text-muted)' }}>
                • {c.key.toUpperCase().replace(/-/g, ' ')}
              </button>
            ))}
            {!cmds.length && <span style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>needs bridge</span>}
          </div>
          <div style={{ fontSize: 9, letterSpacing: '.16em', color: 'var(--text-subtle)', marginBottom: 22 }}>INTENTS RUN HEADLESS · READ-ONLY / DRY-RUN</div>

          <Rule label="LIVE SITES" tag={`${upSites}/${fleet?.length ?? 0} UP`} />
          <div style={{ marginBottom: 22 }}>
            {fleet ? fleet.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, marginBottom: 7 }}>
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', s.ok ? 'bg-green' : 'bg-red')} style={{ boxShadow: s.ok ? '0 0 7px rgba(62,230,168,.8)' : '0 0 7px rgba(255,107,139,.8)' }} />
                <span style={{ color: 'var(--text)', flex: 1 }}>{s.name}</span>
                <span className="tnum" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{s.ok ? `${s.ms}MS` : 'DOWN'}</span>
              </div>
            )) : <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>backend unreachable</span>}
          </div>

          <Rule label="RUN TRAIL" tag="VAULT" />
          {(status?.claude.runs ?? []).slice(0, 5).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 7 }}>
              <span>{r.skill} <span style={{ color: r.verdict.includes('ok') ? 'var(--green)' : 'var(--amber)' }}>{r.verdict}</span></span>
              <span className="tnum" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{r.when.slice(5, 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
