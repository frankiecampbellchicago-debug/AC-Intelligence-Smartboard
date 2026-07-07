import { useEffect, useRef, useState } from 'react'
import { bridgeOnline, fetchStatus, fetchVaultTree } from '../lib/bridge'
import realm from '../assets/odin-realm.jpg'

/* ============================================================
   ODIN — the All-Father. Research agent powered by Perplexity
   Sonar (official API, via the bridge proxy). His ravens Huginn
   (Thought) and Muninn (Memory) fly the nine realms and return
   with sourced knowledge. Norse / God-of-War-Ragnarok aesthetic.
   ============================================================ */

const keyOf = (): string => localStorage.getItem('wc-pplx-key') || ''

// Every model Perplexity offers. `reasons` = accepts a thinking/effort level.
const SONAR = [
  { id: 'sonar', label: 'Sonar', rune: 'ᛊ', tag: 'swift counsel', reasons: false },
  { id: 'sonar-pro', label: 'Sonar Pro', rune: 'ᛈ', tag: 'deep sight, more sources', reasons: false },
  { id: 'sonar-reasoning', label: 'Reasoning', rune: 'ᚱ', tag: 'thinks before it speaks', reasons: true },
  { id: 'sonar-reasoning-pro', label: 'Reasoning Pro', rune: 'ᚦ', tag: 'the long thought', reasons: true },
  { id: 'sonar-deep-research', label: 'Deep Research', rune: 'ᛜ', tag: 'exhaustive report — slow', reasons: true }
]
const DEPTHS = [
  { id: 'low', label: 'Swift', rune: 'ᚠ' },
  { id: 'medium', label: 'Measured', rune: 'ᚷ' },
  { id: 'high', label: 'Deep', rune: 'ᛞ' }
]

interface Source { title: string; url: string; date?: string }
interface Msg {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  related?: string[]
  via?: string
}

interface SonarReply {
  content: string
  citations: string[]
  search_results: Source[]
  related: string[]
  usage: { total_tokens?: number; num_search_queries?: number } | null
  error?: string
}

async function askOdin(model: string, messages: { role: string; content: string }[], depth: string, reasons: boolean): Promise<SonarReply> {
  const options: Record<string, unknown> = { web_search_options: { search_context_size: depth } }
  if (reasons) options.reasoning_effort = depth   // only reasoning / deep-research models accept this
  const res = await fetch('http://localhost:5177/api/sonar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: keyOf(), model, messages, options }),
    signal: AbortSignal.timeout(240000)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `bridge ${res.status}`)
  return data as SonarReply
}

const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

export function Odin(): React.JSX.Element {
  const [brain, setBrain] = useState('')
  const [brainOn, setBrainOn] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [model, setModel] = useState('sonar-pro')
  const [depth, setDepth] = useState('medium')
  const [keyInput, setKeyInput] = useState('')
  const [hasKey, setHasKey] = useState(!!keyOf())
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem('odin-chat') || '[]') } catch { return [] } })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [queries, setQueries] = useState(() => { try { const l = JSON.parse(localStorage.getItem('odin-queries') || '{}'); return l[new Date().toISOString().slice(0, 7)] || 0 } catch { return 0 } })
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('odin-chat', JSON.stringify(msgs.slice(-40))) }, [msgs])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  useEffect(() => {
    void (async () => {
      const ok = await bridgeOnline()
      setOnline(ok)
      if (!ok) return
      const [st, vt] = await Promise.all([fetchStatus(), fetchVaultTree()])
      const wip = st?.claude.wip.map((w) => `${w.project}: ${w.head.slice(0, 60)}`).join('; ') ?? ''
      setBrain(
        `WHO YOU SERVE: Kaiden Amaro — AC Intelligence (AI consulting; sites ac-intelligence, 720tech, nexoria, dva) + Source Alliance freight automation (AP-Banyan, International-UI). Active work: ${wip}. Vault: ${vt?.notes ?? 0} notes. Ground research in his world; be concrete and cite sources.`
      )
      setBrainOn(true)
    })()
  }, [])

  function saveKey(): void {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem('wc-pplx-key', k)
    setHasKey(true); setKeyInput('')
  }

  async function send(): Promise<void> {
    const q = input.trim()
    if (!q || busy) return
    setErr(null); setInput('')
    setMsgs((m) => [...m, { role: 'user', content: q }])
    const mk = new Date().toISOString().slice(0, 7)
    const ql = JSON.parse(localStorage.getItem('odin-queries') || '{}'); ql[mk] = (ql[mk] || 0) + 1
    localStorage.setItem('odin-queries', JSON.stringify(ql)); setQueries(ql[mk])
    const sys = `You are Odin, the All-Father — a research oracle inside Kaiden's Operations System. You send your ravens Huginn and Muninn across the realms to gather truth, then speak it plainly and wisely, always with sources. Be direct and useful, not theatrical. ${brain}`
    const history = msgs.slice(-6).map((m) => ({ role: m.role, content: m.content }))
    try {
      if (!hasKey) throw new Error('Odin needs your Perplexity API key first.')
      setBusy(model === 'sonar-deep-research' ? 'the ravens comb every realm — this takes a while…' : 'the ravens fly the nine realms…')
      const reasons = SONAR.find((s) => s.id === model)?.reasons ?? false
      const r = await askOdin(model, [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }], depth, reasons)
      const sources: Source[] = r.search_results?.length ? r.search_results
        : (r.citations || []).map((u) => ({ title: hostOf(u), url: u }))
      setMsgs((m) => [...m, { role: 'assistant', content: r.content, sources, related: r.related, via: SONAR.find((s) => s.id === model)?.label }])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="odin" style={{ position: 'fixed', inset: 0, left: 228, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#dfe8f2', overflow: 'hidden' }}>
      <style>{`
        .odin .glass{background:rgba(9,13,20,.72);border:1px solid rgba(120,160,210,.28);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
        .odin .rune{font-family:'Palatino','Book Antiqua',serif}
        .odin .cap{font-size:10px;letter-spacing:.3em;color:#7fb0d6;text-transform:uppercase}
        .odin .msgu{background:rgba(120,160,210,.13);border:1px solid rgba(120,160,210,.24)}
        .odin .msga{background:rgba(6,10,16,.6);border:1px solid rgba(120,160,210,.18)}
        .odin textarea{background:transparent;border:0;outline:none;color:#dfe8f2;font-family:inherit;font-size:15px;width:100%;resize:none}
        .odin .src{display:inline-flex;align-items:center;gap:6px;background:rgba(9,13,20,.7);border:1px solid rgba(120,160,210,.3);border-radius:3px;padding:5px 9px;font-size:11px;color:#9fc0dc;text-decoration:none;transition:.15s}
        .odin .src:hover{border-color:#8fd0ff;color:#cfe6ff}
        .odin .rel{background:transparent;border:1px solid rgba(120,160,210,.25);color:#9fc0dc;border-radius:3px;padding:5px 10px;font-size:11.5px;font-family:inherit;cursor:pointer;text-align:left}
        .odin .rel:hover{border-color:#8fd0ff;color:#cfe6ff}
        .odin .modelbtn{background:linear-gradient(180deg,#16233a,#0c1522);border:1px solid #4d7fb0;color:#bcd8f2;font-family:inherit;font-size:12px;letter-spacing:.06em;padding:6px 13px;border-radius:3px;cursor:pointer}
      `}</style>

      {/* Realm backdrop */}
      <img src={realm} alt="" aria-hidden="true" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,10,16,.52), rgba(6,10,16,.64) 55%, rgba(5,8,13,.9))' }} />

      {/* Header */}
      <div className="glass" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '11px 0', borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <span className="rune" style={{ position: 'absolute', left: 22, fontSize: 18, color: '#8fd0ff', letterSpacing: '.2em' }}>ᛟᛞᛁᚾ</span>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.34em', color: '#eaf2fb' }}>ODIN</span>
        <span className="cap" style={{ borderLeft: '1px solid rgba(120,160,210,.3)', paddingLeft: 14 }}>the all-father · seeker of wisdom</span>
        <span style={{ position: 'absolute', right: 22, fontSize: 9.5, letterSpacing: '.16em', color: brainOn ? '#8fd0ff' : '#5a6b7d' }}>
          {brainOn ? '◉ RAVENS LINKED' : online === false ? '○ BRIDGE OFFLINE' : '○ LINKING'}
        </span>
      </div>

      {/* Canvas */}
      <div style={{ position: 'absolute', top: 46, bottom: 120, left: 0, right: 0, overflowY: 'auto', padding: '26px 0' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px' }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '13vh' }}>
              <div className="rune" style={{ fontSize: 40, color: '#8fd0ff', letterSpacing: '.15em', textShadow: '0 0 24px rgba(120,180,255,.5)' }}>ᚼᚢᚴᛁᚾ · ᛘᚢᚾᛁᚾ</div>
              <div style={{ fontSize: 26, letterSpacing: '.1em', marginTop: 14 }}>Ask, and the ravens fly.</div>
              <div style={{ color: '#8ea9c4', marginTop: 8, fontSize: 13.5, fontStyle: 'italic' }}>Thought and Memory cross the nine realms and return with sourced truth.</div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'msgu' : 'msga'} style={{ padding: '13px 17px', borderRadius: 4, margin: '12px 0', lineHeight: 1.65, fontSize: 15, whiteSpace: 'pre-wrap', marginLeft: m.role === 'user' ? '16%' : 0, marginRight: m.role === 'user' ? 0 : '6%' }}>
              {m.via && <div className="cap" style={{ marginBottom: 6, color: '#7fb0d6' }}>ODIN · {m.via}</div>}
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="cap" style={{ marginBottom: 6 }}>ᚱ the ravens brought — {m.sources.length} sources</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {m.sources.map((s, j) => (
                      <a key={j} className="src" href={s.url} target="_blank" rel="noreferrer">
                        <span style={{ color: '#5f8bb5', fontSize: 9 }}>{j + 1}</span>{s.title?.slice(0, 46) || hostOf(s.url)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {m.related && m.related.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="cap" style={{ marginBottom: 6 }}>seek further</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.related.slice(0, 4).map((rq, j) => (
                      <button key={j} className="rel" onClick={() => { setInput(rq); }}>↳ {rq}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy && <div style={{ fontStyle: 'italic', color: '#8fd0ff', padding: '6px 0' }}>🐦‍⬛ {busy}</div>}
          {err && <div className="msga" style={{ padding: 12, borderColor: '#a35', color: '#e8a6b4', borderRadius: 4 }}>{err}</div>}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
        <div className="glass" style={{ width: '100%', maxWidth: 780, borderRadius: 6, padding: '12px 14px 10px' }}>
          {!hasKey ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} type="password"
                placeholder="Paste your Perplexity API key (perplexity.ai → Settings → API)…"
                style={{ flex: 1, background: 'transparent', border: '1px solid rgba(120,160,210,.3)', borderRadius: 3, color: '#dfe8f2', fontFamily: 'inherit', fontSize: 13, padding: '9px 11px', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey() }} />
              <button className="modelbtn" onClick={saveKey}>Bind key</button>
            </div>
          ) : (
            <>
              <textarea rows={2} value={input} placeholder="Ask Odin to research anything…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {SONAR.map((s) => (
                    <button key={s.id} onClick={() => setModel(s.id)}
                      style={{ background: model === s.id ? 'linear-gradient(180deg,#1c3350,#0c1522)' : 'transparent', border: `1px solid ${model === s.id ? '#8fd0ff' : 'rgba(120,160,210,.25)'}`, color: model === s.id ? '#cfe6ff' : '#8ea9c4', fontFamily: 'inherit', fontSize: 10.5, letterSpacing: '.04em', padding: '5px 9px', borderRadius: 3, cursor: 'pointer' }}
                      title={s.tag}>
                      <span className="rune" style={{ marginRight: 4 }}>{s.rune}</span>{s.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="cap" style={{ fontSize: 9 }}>depth</span>
                  {DEPTHS.map((d) => (
                    <button key={d.id} onClick={() => setDepth(d.id)}
                      title={SONAR.find((s) => s.id === model)?.reasons ? 'thinking effort + search depth' : 'search depth'}
                      style={{ background: depth === d.id ? 'linear-gradient(180deg,#1c3350,#0c1522)' : 'transparent', border: `1px solid ${depth === d.id ? '#8fd0ff' : 'rgba(120,160,210,.25)'}`, color: depth === d.id ? '#cfe6ff' : '#8ea9c4', fontFamily: 'inherit', fontSize: 10.5, padding: '5px 8px', borderRadius: 3, cursor: 'pointer' }}>
                      <span className="rune" style={{ marginRight: 4 }}>{d.rune}</span>{d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 9.5, color: '#6f8298', letterSpacing: '.08em', marginTop: 4 }}>{queries} queries this month · $5 Pro credit</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
