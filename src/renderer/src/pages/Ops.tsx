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

/* The Mind — a volumetric point-cloud sphere: hundreds of nodes filling a globe,
   a bright glowing core, scattered bright "stars" among many dim points, and a
   triangulated web of faint lines connecting near neighbours (fixed in 3D, so the
   whole graph rotates rigidly). Slow calm rotation with occasional neuron-lights. */
function Brain({ notes, active }: { notes: number; active: boolean; tempo?: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const stR = useRef({ active })
  stR.current = { active }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const S = 640
    canvas.width = S * dpr; canvas.height = S * dpr
    ctx.scale(dpr, dpr)
    const cx = S / 2, cy = S / 2
    const R = S * 0.37
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 3D nodes filling the sphere volume (uniform → naturally denser core in projection)
    const N = Math.min(440, 300 + notes * 3)
    const P3 = [...Array(N)].map(() => {
      const t = Math.acos(2 * Math.random() - 1), p = Math.random() * Math.PI * 2
      const rr = R * Math.cbrt(Math.random())
      return {
        x: rr * Math.sin(t) * Math.cos(p), y: rr * Math.cos(t), z: rr * Math.sin(t) * Math.sin(p),
        star: Math.random() < 0.16, ph: Math.random() * Math.PI * 2, sz: 0.6 + Math.random() * 1.1
      }
    })
    // fixed edges: connect each node to its ~4 nearest neighbours (rigid → compute once)
    const edgeSet = new Set<string>()
    const edges: [number, number][] = []
    for (let i = 0; i < N; i++) {
      const near = P3.map((q, j) => ({ j, d: (P3[i].x - q.x) ** 2 + (P3[i].y - q.y) ** 2 + (P3[i].z - q.z) ** 2 }))
        .filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 4)
      for (const { j } of near) { const key = i < j ? `${i}-${j}` : `${j}-${i}`; if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([Math.min(i, j), Math.max(i, j)]) } }
    }

    interface Flow { e: number; k: number }
    let flows: Flow[] = []
    let a = 0, raf = 0, frame = 0

    const draw = (): void => {
      const { active: act } = stR.current
      a += 0.0015 * (act ? 1.3 : 1) // slow, calm
      frame++
      const ca = Math.cos(a), sa = Math.sin(a)
      // rotate about vertical axis + project
      const PP = P3.map((pt) => {
        const x = pt.x * ca + pt.z * sa
        const z = -pt.x * sa + pt.z * ca
        return [cx + x, cy + pt.y * 0.98, (z + R) / (2 * R)] as [number, number, number]
      })

      ctx.clearRect(0, 0, S, S)

      // central core glow — the brightest heart of the cloud
      const beat = 1 + 0.05 * Math.sin(frame * (act ? 0.05 : 0.03))
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55 * beat)
      core.addColorStop(0, `rgba(150,165,240,${act ? 0.28 : 0.2})`)
      core.addColorStop(0.4, 'rgba(120,130,220,0.08)')
      core.addColorStop(1, 'rgba(120,130,220,0)')
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55 * beat, 0, Math.PI * 2); ctx.fill()

      // triangulated web — faint blue lines, depth-shaded
      ctx.lineWidth = 0.7
      for (const [i, j] of edges) {
        const d = (PP[i][2] + PP[j][2]) / 2
        ctx.strokeStyle = `rgba(120,140,220,${0.04 + d * 0.16})`
        ctx.beginPath(); ctx.moveTo(PP[i][0], PP[i][1]); ctx.lineTo(PP[j][0], PP[j][1]); ctx.stroke()
      }

      // occasional slow neuron-lights travelling an edge
      if (!reduced && frame % (act ? 20 : 34) === 0) flows.push({ e: Math.floor(Math.random() * edges.length), k: 0 })
      ctx.globalCompositeOperation = 'lighter'
      flows = flows.filter((f) => f.k < 1)
      for (const f of flows) {
        f.k += act ? 0.014 : 0.01
        const [i, j] = edges[f.e]
        const x = PP[i][0] + (PP[j][0] - PP[i][0]) * f.k
        const y = PP[i][1] + (PP[j][1] - PP[i][1]) * f.k
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6)
        g.addColorStop(0, 'rgba(220,225,255,.85)'); g.addColorStop(1, 'rgba(170,180,255,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill()
      }

      // nodes — dim blue majority + scattered bright twinkling stars
      for (let i = 0; i < N; i++) {
        const [x, y, depth] = PP[i]
        if (P3[i].star) {
          const tw = 0.6 + 0.4 * Math.sin(frame * 0.04 + P3[i].ph)
          const rad = (1.4 + depth * 2.4) * P3[i].sz
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3.2)
          g.addColorStop(0, `rgba(225,230,255,${(0.5 + depth * 0.5) * tw})`)
          g.addColorStop(0.4, `rgba(160,175,255,${0.3 * depth})`)
          g.addColorStop(1, 'rgba(160,175,255,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 3.2, 0, Math.PI * 2); ctx.fill()
        } else {
          const rad = (0.5 + depth * 1.1) * P3[i].sz
          ctx.fillStyle = `rgba(150,170,235,${0.18 + depth * 0.5})`
          ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalCompositeOperation = 'source-over'

      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [notes])
  return <canvas ref={ref} style={{ width: 600, height: 600, maxWidth: '54vw' }} aria-hidden="true" />
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
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '.1em', color: 'var(--text)', lineHeight: 1 }}>A.C.O.S.</div>
          <div style={{ fontSize: 8, letterSpacing: '.18em', color: 'var(--text-subtle)', marginTop: 3 }}>AMARO·CAMPBELL OPERATIONS SYSTEM</div>
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
          <div style={{ marginTop: -34, textAlign: 'center', position: 'relative' }}>
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
