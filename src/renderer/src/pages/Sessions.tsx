import { useEffect, useState } from 'react'
import { Card, Button } from '../components/ui'
import { cn } from '../lib/util'
import {
  bridgeOnline, fetchSessions, gradeSession,
  fetchAgentSessions, gradeAgentSession, gradeAllAgent,
  type SessionGrade
} from '../lib/bridge'

/* ============================================================
   Session Coach — three tracks, each with its own rubric:
   • Claude Code — how hard you drive Claude
   • Athena — multi-model delegation craft
   • Odin — Perplexity deep-research craft
   ============================================================ */

type Source = 'claude' | 'athena' | 'odin'
const SOURCES: { id: Source; label: string; blurb: string }[] = [
  { id: 'claude', label: 'Claude Code', blurb: 'Every Claude Code session, rated on how effectively you drove Claude.' },
  { id: 'athena', label: 'Athena', blurb: 'Every Athena conversation, rated on multi-model delegation craft.' },
  { id: 'odin', label: 'Odin', blurb: 'Every Odin session, rated on Perplexity deep-research craft — did you use the web where it counts?' }
]

interface Grade { score: number; headline: string; strengths: string[]; improvements: string[]; powerTips: string[]; meta: string }
interface Row { id: string; when: string; label: string; sub: string; grade: Grade | null }

function ScoreRing({ score, tint }: { score: number; tint?: string }): React.JSX.Element {
  const pct = score * 10
  const hue = tint || (score >= 8 ? 'var(--green)' : score >= 5 ? 'var(--amber)' : 'var(--red)')
  return (
    <div className="tnum flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-text"
      style={{ background: `conic-gradient(${hue} ${pct}%, rgba(255,255,255,0.08) 0)` }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d0e18]">{score}</span>
    </div>
  )
}

export function Sessions(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [source, setSource] = useState<Source>('claude')
  const [rows, setRows] = useState<Row[]>([])
  const [grading, setGrading] = useState<string | null>(null)
  const [gradingAll, setGradingAll] = useState(false)
  const [sel, setSel] = useState<Row | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load(src: Source): Promise<void> {
    if (src === 'claude') {
      const d = await fetchSessions()
      setRows((d?.sessions ?? []).map((r) => ({
        id: r.id, when: new Date(r.mtime).toLocaleDateString(), label: r.project || 'home',
        sub: `${r.sizeMB}MB${r.grade ? ` · ${r.grade.stats.msgCount} asks · ${r.grade.stats.toolCalls} tools` : ' · not graded'}`,
        grade: r.grade ? { ...r.grade, meta: `${r.grade.stats.msgCount} asks · ${r.grade.stats.assistantTurns} turns · ${r.grade.stats.toolCalls} tools${r.grade.stats.durationMin ? ` · ~${r.grade.stats.durationMin}m` : ''}` } : null
      })))
    } else {
      const d = await fetchAgentSessions(src)
      setRows((d?.sessions ?? []).map((r) => ({
        id: r.id, when: new Date(r.savedAt).toLocaleDateString(), label: r.title || 'session',
        sub: `${r.msgCount} ${src === 'odin' ? 'questions' : 'asks'}${r.models.length ? ` · ${r.models.map((m) => m.split('/').pop()).join(', ').slice(0, 40)}` : ''}`,
        grade: r.grade ? { ...r.grade, meta: `${r.msgCount} ${src === 'odin' ? 'research questions' : 'messages'} · graded ${new Date(r.grade.gradedAt).toLocaleDateString()}` } : null
      })))
    }
  }

  useEffect(() => {
    void (async () => {
      const ok = await bridgeOnline()
      setOnline(ok)
      if (ok) await load(source)
    })()
  }, [])

  async function switchTo(src: Source): Promise<void> {
    setSource(src); setSel(null); setErr(null); setRows([])
    if (online) await load(src)
  }

  async function grade(row: Row): Promise<void> {
    setGrading(row.id); setErr(null)
    const res = source === 'claude' ? await gradeSession(row.id) : await gradeAgentSession(source, row.id)
    setGrading(null)
    if ('error' in res) setErr(res.error)
    else { await load(source); const g = res as Grade | SessionGrade; setSel({ ...row, grade: { ...(g as Grade), meta: row.sub } }) }
  }

  async function gradeAllUngraded(): Promise<void> {
    if (source === 'claude') return
    setGradingAll(true); setErr(null)
    await gradeAllAgent(source)
    // poll a few times as grades land
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 8000)); await load(source) }
    setGradingAll(false)
  }

  const graded = rows.filter((r) => r.grade)
  const avg = graded.length ? Math.round((graded.reduce((a, r) => a + (r.grade?.score ?? 0), 0) / graded.length) * 10) / 10 : null
  const ungraded = rows.filter((r) => !r.grade).length
  const cur = SOURCES.find((s) => s.id === source)!

  return (
    <div className="rise-in mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">System</p>
          <h1 className="font-display text-2xl font-bold text-text">Session Coach</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{cur.blurb}</p>
        </div>
        {avg !== null && (
          <div className="text-right">
            <div className="tnum font-display text-[30px] font-bold leading-none text-text">{avg}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">{cur.label} avg · {graded.length} graded</div>
          </div>
        )}
      </div>

      {/* Source switcher */}
      <div className="flex items-center gap-2">
        {SOURCES.map((s) => (
          <button key={s.id} onClick={() => void switchTo(s.id)}
            className={cn('rounded-full border px-4 py-1.5 text-[12.5px] font-semibold tracking-wide transition',
              source === s.id ? 'border-accent/60 bg-accent-soft text-accent' : 'border-border text-muted hover:border-border-strong hover:text-text')}>
            {s.label}
          </button>
        ))}
        {source !== 'claude' && ungraded > 0 && online && (
          <button onClick={() => void gradeAllUngraded()} disabled={gradingAll}
            className="ml-auto rounded-full border border-border px-3.5 py-1.5 text-[12px] text-muted hover:text-text disabled:opacity-50">
            {gradingAll ? 'Grading all…' : `Grade all ${ungraded} ungraded`}
          </button>
        )}
      </div>

      {online === false && (
        <Card className="p-5" interactive={false}>
          <p className="text-sm text-muted">
            The coach reads sessions on your Mac — start the bridge:{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-cyan">cd ~/agentic-os/dashboard && node server.mjs</code>
          </p>
        </Card>
      )}
      {err && <p className="rounded-lg border border-red/25 bg-red/10 px-3 py-2 text-[13px] text-red">{err}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* List */}
        <div className="space-y-2 lg:col-span-2">
          {rows.length === 0 && online !== false && (
            <p className="px-1 text-[13px] text-subtle">
              {source === 'claude' ? 'No sessions found.' : `No ${cur.label} sessions yet — chat with ${cur.label} and they'll appear here.`}
            </p>
          )}
          {rows.map((r) => (
            <button key={r.id} onClick={() => setSel(r)}
              className={cn('flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition',
                sel?.id === r.id ? 'border-accent/50 bg-accent-soft' : 'border-border bg-surface/60 hover:border-border-strong')}>
              {r.grade ? <ScoreRing score={r.grade.score} /> : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-subtle">—</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{r.when} · {r.label}</div>
                <div className="truncate text-[11px] text-subtle">{r.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {sel ? (
            <Card className="p-6" interactive={false}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">{cur.label} · {sel.when} · {sel.label.slice(0, 40)}</div>
                  {sel.grade && <h2 className="font-display mt-2 text-lg font-bold leading-snug text-text">{sel.grade.headline}</h2>}
                </div>
                {sel.grade && <ScoreRing score={sel.grade.score} />}
              </div>

              {sel.grade ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-green">What worked</div>
                    <ul className="space-y-1.5">{sel.grade.strengths.map((s, i) => <li key={i} className="text-[13.5px] leading-relaxed text-muted">+ {s}</li>)}</ul>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber">Do differently</div>
                    <ul className="space-y-1.5">{sel.grade.improvements.map((s, i) => <li key={i} className="text-[13.5px] leading-relaxed text-muted">→ {s}</li>)}</ul>
                  </div>
                  {sel.grade.powerTips.length > 0 && (
                    <div className="rounded-[12px] border border-accent/25 bg-accent-soft p-4">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{source === 'odin' ? 'Perplexity power tips' : 'Power tips'}</div>
                      <ul className="space-y-1.5">{sel.grade.powerTips.map((s, i) => <li key={i} className="text-[13.5px] leading-relaxed text-text">★ {s}</li>)}</ul>
                    </div>
                  )}
                  <div className="tnum text-[11px] text-subtle">{sel.grade.meta}</div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-start gap-3">
                  <p className="text-sm text-muted">This session hasn't been graded yet.</p>
                  <Button onClick={() => void grade(sel)} disabled={grading !== null || !online}>
                    {grading === sel.id ? 'Grading… (1–3 min)' : 'Grade this session'}
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex h-full min-h-[200px] items-center justify-center p-6 text-sm text-muted" interactive={false}>
              Select a session.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
