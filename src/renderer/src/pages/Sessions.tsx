import { useEffect, useState } from 'react'
import { Card, Button } from '../components/ui'
import { cn } from '../lib/util'
import { bridgeOnline, fetchSessions, gradeSession, type SessionRow, type SessionGrade } from '../lib/bridge'

function ScoreRing({ score }: { score: number }): React.JSX.Element {
  const pct = score * 10
  const hue = score >= 8 ? 'var(--green)' : score >= 5 ? 'var(--amber)' : 'var(--red)'
  return (
    <div
      className="tnum flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-text"
      style={{ background: `conic-gradient(${hue} ${pct}%, rgba(255,255,255,0.08) 0)` }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d0e18]">{score}</span>
    </div>
  )
}

export function Sessions(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [rows, setRows] = useState<SessionRow[]>([])
  const [grading, setGrading] = useState<string | null>(null)
  const [sel, setSel] = useState<SessionRow | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load(): Promise<void> {
    const data = await fetchSessions()
    if (data) setRows(data.sessions)
  }

  useEffect(() => {
    void (async () => {
      const ok = await bridgeOnline()
      setOnline(ok)
      if (ok) await load()
    })()
  }, [])

  async function grade(row: SessionRow): Promise<void> {
    setGrading(row.id)
    setErr(null)
    const res = await gradeSession(row.id)
    setGrading(null)
    if ('error' in res) setErr(res.error)
    else {
      await load()
      setSel({ ...row, grade: res as SessionGrade })
    }
  }

  const graded = rows.filter((r) => r.grade)
  const avg = graded.length ? Math.round((graded.reduce((a, r) => a + (r.grade?.score ?? 0), 0) / graded.length) * 10) / 10 : null

  return (
    <div className="rise-in mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">System</p>
          <h1 className="font-display text-2xl font-bold text-text">Session Coach</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Every Claude Code session, rated 1–10 with honest coaching on how to drive Claude harder.
          </p>
        </div>
        {avg !== null && (
          <div className="text-right">
            <div className="tnum font-display text-[30px] font-bold leading-none text-text">{avg}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">avg · {graded.length} graded</div>
          </div>
        )}
      </div>

      {online === false && (
        <Card className="p-5" interactive={false}>
          <p className="text-sm text-muted">
            The coach reads your session transcripts on the Mac — start the bridge:{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-cyan">cd ~/agentic-os/dashboard && node server.mjs</code>
          </p>
        </Card>
      )}
      {err && <p className="rounded-lg border border-red/25 bg-red/10 px-3 py-2 text-[13px] text-red">{err}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* List */}
        <div className="space-y-2 lg:col-span-2">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setSel(r)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition',
                sel?.id === r.id ? 'border-accent/50 bg-accent-soft' : 'border-border bg-surface/60 hover:border-border-strong'
              )}
            >
              {r.grade ? (
                <ScoreRing score={r.grade.score} />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-subtle">
                  —
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">
                  {new Date(r.mtime).toLocaleDateString()} · {r.project || 'home'}
                </div>
                <div className="truncate text-[11px] text-subtle">
                  {r.sizeMB}MB{r.grade ? ` · ${r.grade.stats.msgCount} asks · ${r.grade.stats.toolCalls} tools` : ' · not graded'}
                </div>
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
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">
                    {new Date(sel.mtime).toLocaleString()} · {sel.id.slice(0, 8)}
                  </div>
                  {sel.grade && <h2 className="font-display mt-2 text-lg font-bold leading-snug text-text">{sel.grade.headline}</h2>}
                </div>
                {sel.grade && <ScoreRing score={sel.grade.score} />}
              </div>

              {sel.grade ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-green">What worked</div>
                    <ul className="space-y-1.5">
                      {sel.grade.strengths.map((s, i) => (
                        <li key={i} className="text-[13.5px] leading-relaxed text-muted">+ {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber">Do differently</div>
                    <ul className="space-y-1.5">
                      {sel.grade.improvements.map((s, i) => (
                        <li key={i} className="text-[13.5px] leading-relaxed text-muted">→ {s}</li>
                      ))}
                    </ul>
                  </div>
                  {sel.grade.powerTips.length > 0 && (
                    <div className="rounded-[12px] border border-accent/25 bg-accent-soft p-4">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Power tips</div>
                      <ul className="space-y-1.5">
                        {sel.grade.powerTips.map((s, i) => (
                          <li key={i} className="text-[13.5px] leading-relaxed text-text">★ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="tnum text-[11px] text-subtle">
                    {sel.grade.stats.msgCount} asks · {sel.grade.stats.assistantTurns} turns · {sel.grade.stats.toolCalls} tool calls
                    {sel.grade.stats.durationMin ? ` · ~${sel.grade.stats.durationMin} min` : ''} · graded {new Date(sel.grade.gradedAt).toLocaleString()}
                  </div>
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
