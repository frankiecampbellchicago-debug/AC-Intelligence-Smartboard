import { useEffect, useRef, useState } from 'react'
import { bridgeOnline, fetchStatus, fetchVaultTree } from '../lib/bridge'
import odyssey from '../assets/athena-odyssey.jpg'
import mural from '../assets/athena-mural.jpg'

/* ============================================================
   ATHENA — Odyssey edition. Open canvas chat, top-tab interfaces,
   bottom-right god/model selector, node-graph delegation editor.
   ============================================================ */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
const keyOf = (): string => localStorage.getItem('wc-openrouter-key') || ''

const MODELS = [
  { id: 'anthropic/claude-opus-4.8', label: 'Opus 4.8' },
  { id: 'anthropic/claude-sonnet-5', label: 'Sonnet 5' },
  { id: 'openai/gpt-5.3-codex', label: 'GPT-5.3 Codex' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5' },
  { id: 'z-ai/glm-4.7', label: 'GLM 4.7' },
  { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek V3.1' },
  { id: 'perplexity/sonar-pro', label: 'Sonar Pro' }
]
const short = (id: string): string => MODELS.find((m) => m.id === id)?.label || id.split('/').pop() || id

interface Delegator { id: string; name: string; operator: string; workers: (string | null)[]; bestFor: string }
const DEFAULTS: Delegator[] = [
  { id: 'apollo', name: 'Apollo · Websites', operator: 'anthropic/claude-opus-4.8', bestFor: 'Sites, redesigns, copy', workers: ['openai/gpt-5.3-codex', 'google/gemini-3.1-pro-preview', 'z-ai/glm-4.7'] },
  { id: 'hephaestus', name: 'Hephaestus · Automations', operator: 'anthropic/claude-opus-4.8', bestFor: 'Functions, scripts, pipelines', workers: ['openai/gpt-5.3-codex', 'deepseek/deepseek-chat-v3.1', 'moonshotai/kimi-k2.5'] },
  { id: 'delphi', name: 'Delphi · Research', operator: 'anthropic/claude-sonnet-5', bestFor: 'Deep sourced research', workers: ['perplexity/sonar-pro', 'moonshotai/kimi-k2.5', 'google/gemini-3.1-pro-preview'] },
  { id: 'muses', name: 'Muses · Imagery', operator: 'anthropic/claude-sonnet-5', bestFor: 'Art direction, prompts', workers: ['google/gemini-3.1-pro-preview', 'z-ai/glm-4.7', null] }
]

interface Msg { role: 'user' | 'assistant'; content: string; via?: string; workings?: { model: string; out: string }[] }

async function llm(model: string, messages: { role: string; content: string }[], effort?: string, maxTokens = 5000): Promise<string> {
  const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens }
  if (effort) body.reasoning = { effort }
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${keyOf()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter ${res.status}`)
  return data.choices?.[0]?.message?.content ?? ''
}

export function Athena(): React.JSX.Element {
  const [tab, setTab] = useState<'chat' | 'delegation'>('chat')
  const [brain, setBrain] = useState('')
  const [brainOn, setBrainOn] = useState(false)
  const [mode, setMode] = useState<string>('single')
  const [model, setModel] = useState(MODELS[0].id)
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [delegators, setDelegators] = useState<Delegator[]>(() => {
    try { const d = JSON.parse(localStorage.getItem('athena-delegators-v2') || 'x'); return Array.isArray(d) ? d : DEFAULTS } catch { return DEFAULTS }
  })
  const [editId, setEditId] = useState('apollo')
  const [slotSel, setSlotSel] = useState<number | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem('athena-chat') || '[]') } catch { return [] } })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('athena-chat', JSON.stringify(msgs.slice(-60))) }, [msgs])
  useEffect(() => { localStorage.setItem('athena-delegators-v2', JSON.stringify(delegators)) }, [delegators])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  useEffect(() => {
    void (async () => {
      if (!(await bridgeOnline())) return
      const [st, vt] = await Promise.all([fetchStatus(), fetchVaultTree()])
      const wip = st?.claude.wip.map((w) => `${w.project}: ${w.head.slice(0, 70)}`).join('\n') ?? ''
      setBrain(
        `OPERATOR PROFILE: Kaiden Amaro — AC Intelligence (AI consulting, partner Frankie Campbell; sites ac-intelligence/720tech/nexoria/dva) + Source Alliance freight automation (AP-Banyan, International-UI, Azure; colleagues Greg, Aurora). Wants evidence before "done", premium visuals, one-step-at-a-time on freight.\nVAULT: ${vt?.notes ?? 0} notes. WIP:\n${wip}\nPulse: ${st?.pulse.commits7 ?? '?'} commits/7d.`
      )
      setBrainOn(true)
    })()
  }, [])

  const active = delegators.find((d) => d.id === mode) || null
  const editing = delegators.find((d) => d.id === editId) || delegators[0]

  function setWorker(slot: number, m: string | null): void {
    setDelegators(delegators.map((d) => d.id === editing.id ? { ...d, workers: d.workers.map((w, i) => (i === slot ? m : w)) } : d))
  }

  async function send(): Promise<void> {
    const q = input.trim()
    if (!q || busy) return
    setErr(null); setInput('')
    setMsgs((m) => [...m, { role: 'user', content: q }])
    const sys = `You are Athena — Kaiden's operator agent in his Operations System. Direct, wise, concise.\n${brain || '(bridge offline — no personal context)'}`
    const history = msgs.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    try {
      if (!keyOf()) throw new Error('No OpenRouter key — add it in Settings (Image generation card).')
      if (!active) {
        setBusy(`${short(model)} is thinking…`)
        const out = await llm(model, [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }], effort)
        setMsgs((m) => [...m, { role: 'assistant', content: out, via: `${short(model)} · ${effort}` }])
      } else {
        const workers = active.workers.filter(Boolean) as string[]
        setBusy(`${active.name.split('·')[0].trim()} plans…`)
        const plan = await llm(active.operator, [
          { role: 'system', content: sys },
          { role: 'user', content: `Task: ${q}\n\nWorkers:\n${workers.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nWrite one self-contained brief per worker labeled "WORKER 1:" etc. If trivial, reply NO_DELEGATION then answer directly.` }
        ], effort)
        if (plan.trim().startsWith('NO_DELEGATION') || workers.length === 0) {
          setMsgs((m) => [...m, { role: 'assistant', content: plan.replace('NO_DELEGATION', '').trim(), via: active.name }])
        } else {
          setBusy('the workers labor…')
          const briefs = workers.map((_, i) => plan.match(new RegExp(`WORKER ${i + 1}:([\\s\\S]*?)(?=WORKER ${i + 2}:|$)`))?.[1]?.trim() || q)
          const outs = await Promise.all(workers.map((w, i) => llm(w, [{ role: 'user', content: briefs[i] }], undefined, 3000).catch((e) => `⚠ ${e.message}`)))
          setBusy('Athena weighs the counsel…')
          const fin = await llm(active.operator, [
            { role: 'system', content: sys },
            { role: 'user', content: `Task: ${q}\n\nWorker results:\n${workers.map((w, i) => `--- ${w} ---\n${outs[i]}`).join('\n\n')}\n\nSynthesize the best final answer; verify claims across workers; deliver the work product.` }
          ], effort, 6000)
          setMsgs((m) => [...m, { role: 'assistant', content: fin, via: active.name, workings: workers.map((w, i) => ({ model: w, out: outs[i] })) }])
        }
      }
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  /* node graph geometry */
  const OPX = 300, OPY = 60, WY = 210, WXS = [90, 300, 510]

  return (
    <div className="athena" style={{ position: 'fixed', inset: 0, left: 228, fontFamily: "'Palatino','Book Antiqua',Georgia,serif", color: '#efe6d0', overflow: 'hidden' }}>
      <style>{`
        .athena .tabbtn{background:transparent;border:0;border-bottom:2px solid transparent;color:#b9ad92;font-family:inherit;font-size:12.5px;letter-spacing:.32em;padding:14px 22px;cursor:pointer;text-transform:uppercase}
        .athena .tabbtn.on{color:#e8c95a;border-bottom-color:#c9a227}
        .athena .glass{background:rgba(14,11,6,.72);border:1px solid rgba(201,162,39,.3);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
        .athena .msgu{background:rgba(201,162,39,.14);border:1px solid rgba(201,162,39,.25)}
        .athena .msga{background:rgba(10,8,4,.62);border:1px solid rgba(201,162,39,.18)}
        .athena textarea{background:transparent;border:0;outline:none;color:#efe6d0;font-family:inherit;font-size:15px;width:100%;resize:none}
        .athena .via{font-size:10px;letter-spacing:.24em;color:#c9a227;text-transform:uppercase;margin-bottom:6px}
        .athena details summary{cursor:pointer;color:#c9a227;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase}
        .athena .rost{display:block;width:100%;text-align:left;background:rgba(10,8,4,.5);border:1px solid rgba(201,162,39,.25);color:#d9cdb0;font-family:inherit;font-size:12.5px;padding:7px 10px;border-radius:2px;cursor:pointer;margin-bottom:6px}
        .athena .rost:hover{border-color:#e8c95a;color:#e8c95a}
        .athena .nodecirc{cursor:pointer;transition:.2s}
      `}</style>

      {/* backdrop per tab */}
      <img src={tab === 'chat' ? odyssey : mural} alt="" aria-hidden="true" draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: tab === 'chat'
        ? 'linear-gradient(180deg, rgba(12,9,4,.5), rgba(12,9,4,.62) 55%, rgba(10,8,4,.9))'
        : 'linear-gradient(180deg, rgba(10,8,5,.84), rgba(10,8,5,.94))' }} />

      {/* top tab bar */}
      <div className="glass" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <span style={{ position: 'absolute', left: 22, color: '#e8c95a', letterSpacing: '.3em', fontSize: 13 }}>ΑΘΗΝΑ</span>
        <button className={`tabbtn ${tab === 'chat' ? 'on' : ''}`} onClick={() => setTab('chat')}>Chamber</button>
        <button className={`tabbtn ${tab === 'delegation' ? 'on' : ''}`} onClick={() => setTab('delegation')}>Delegation</button>
        <span style={{ position: 'absolute', right: 22, fontSize: 10, letterSpacing: '.18em', color: brainOn ? '#e8c95a' : '#7a705a' }}>
          {brainOn ? '◉ BRAIN LINKED' : '○ BRAIN OFFLINE'}
        </span>
      </div>

      {tab === 'chat' && (
        <>
          {/* open canvas */}
          <div style={{ position: 'absolute', top: 50, bottom: 118, left: 0, right: 0, overflowY: 'auto', padding: '28px 0' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
              {msgs.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: '16vh' }}>
                  <div style={{ fontSize: 30, letterSpacing: '.12em' }}>Speak, wanderer.</div>
                  <div style={{ fontStyle: 'italic', color: '#c4b795', marginTop: 8, fontSize: 14 }}>The goddess listens — or sends her council.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'msgu' : 'msga'} style={{ padding: '13px 17px', borderRadius: 4, margin: '12px 0', lineHeight: 1.65, fontSize: 15, whiteSpace: 'pre-wrap', marginLeft: m.role === 'user' ? '15%' : 0, marginRight: m.role === 'user' ? 0 : '8%' }}>
                  {m.via && <div className="via">{m.via}</div>}
                  {m.content}
                  {m.workings && (
                    <details style={{ marginTop: 10 }}>
                      <summary>the workers' scrolls ({m.workings.length})</summary>
                      {m.workings.map((w, j) => (
                        <div key={j} style={{ marginTop: 8, padding: 10, background: 'rgba(0,0,0,.4)', borderRadius: 3, fontSize: 12.5 }}>
                          <div className="via">{w.model}</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{w.out.slice(0, 2200)}{w.out.length > 2200 ? '…' : ''}</div>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              ))}
              {busy && <div style={{ fontStyle: 'italic', color: '#e8c95a', padding: '6px 0' }}>⚡ {busy}</div>}
              {err && <div className="msga" style={{ padding: 12, borderColor: '#a33', color: '#e8a0a0', borderRadius: 4 }}>{err}</div>}
              <div ref={endRef} />
            </div>
          </div>

          {/* composer */}
          <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
            <div className="glass" style={{ width: '100%', maxWidth: 760, borderRadius: 6, padding: '12px 14px 10px', position: 'relative' }}>
              <textarea rows={2} value={input} placeholder={active ? `Command ${active.name.split('·')[0].trim()}…` : 'Ask Athena…'}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 10.5, color: '#8d8266', letterSpacing: '.1em' }}>enter to send · shift+enter newline</span>
                {/* bottom-right selector */}
                <button onClick={() => setPickerOpen(!pickerOpen)}
                  style={{ background: 'linear-gradient(180deg,#3a2f10,#241d0a)', border: '1px solid #c9a227', color: '#e8c95a', fontFamily: 'inherit', fontSize: 12, letterSpacing: '.08em', padding: '6px 14px', borderRadius: 3, cursor: 'pointer' }}>
                  {active ? active.name.split('·')[0].trim() : short(model)} · {effort} ▾
                </button>
              </div>
              {pickerOpen && (
                <div className="glass" style={{ position: 'absolute', bottom: '105%', right: 0, width: 320, borderRadius: 5, padding: 14, maxHeight: 380, overflowY: 'auto' }}>
                  <div className="via">Gods (delegator packages)</div>
                  {delegators.map((d) => (
                    <button key={d.id} className="rost" style={mode === d.id ? { borderColor: '#e8c95a', color: '#e8c95a' } : {}} onClick={() => { setMode(d.id); setPickerOpen(false) }}>
                      {d.name} <span style={{ opacity: .6, fontSize: 11 }}>— {d.bestFor}</span>
                    </button>
                  ))}
                  <div className="via" style={{ marginTop: 10 }}>Single voice</div>
                  {MODELS.map((m) => (
                    <button key={m.id} className="rost" style={mode === 'single' && model === m.id ? { borderColor: '#e8c95a', color: '#e8c95a' } : {}} onClick={() => { setMode('single'); setModel(m.id); setPickerOpen(false) }}>{m.label}</button>
                  ))}
                  <div className="via" style={{ marginTop: 10 }}>Depth of thought</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['low', 'medium', 'high'] as const).map((e) => (
                      <button key={e} className="rost" style={{ marginBottom: 0, textAlign: 'center', ...(effort === e ? { borderColor: '#e8c95a', color: '#e8c95a' } : {}) }} onClick={() => setEffort(e)}>{e}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'delegation' && (
        <div style={{ position: 'absolute', top: 50, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            {delegators.map((d) => (
              <button key={d.id} className="rost" style={{ width: 'auto', marginBottom: 0, ...(editId === d.id ? { borderColor: '#e8c95a', color: '#e8c95a' } : {}) }} onClick={() => { setEditId(d.id); setSlotSel(null) }}>{d.name}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* roster */}
            <div className="glass" style={{ width: 210, borderRadius: 5, padding: 14 }}>
              <div className="via">The roster — click to place</div>
              {MODELS.map((m) => (
                <button key={m.id} className="rost" onClick={() => {
                  const slot = slotSel ?? editing.workers.findIndex((w) => !w)
                  if (slot >= 0) { setWorker(slot, m.id); setSlotSel(null) }
                }}>{m.label}</button>
              ))}
              <div style={{ fontSize: 11, color: '#8d8266', fontStyle: 'italic', marginTop: 6 }}>
                {slotSel !== null ? `placing into hand ${slotSel + 1}…` : 'click a circle below to empty it, then pick a model'}
              </div>
            </div>
            {/* node graph */}
            <div className="glass" style={{ borderRadius: 5, padding: 10 }}>
              <svg width="600" height="290" viewBox="0 0 600 290">
                {WXS.map((x, i) => (
                  <line key={i} x1={OPX} y1={OPY + 34} x2={x} y2={WY - 34} stroke={editing.workers[i] ? '#c9a227' : 'rgba(201,162,39,.25)'} strokeWidth="1.5" strokeDasharray={editing.workers[i] ? '0' : '5 5'} />
                ))}
                {/* operator */}
                <circle cx={OPX} cy={OPY} r="34" fill="rgba(58,47,16,.9)" stroke="#e8c95a" strokeWidth="2" />
                <text x={OPX} y={OPY - 2} textAnchor="middle" fill="#e8c95a" fontSize="11" fontFamily="Palatino,serif" letterSpacing="1">OPERATOR</text>
                <text x={OPX} y={OPY + 13} textAnchor="middle" fill="#efe6d0" fontSize="10.5" fontFamily="Palatino,serif">{short(editing.operator)}</text>
                {/* workers */}
                {WXS.map((x, i) => {
                  const w = editing.workers[i]
                  const sel = slotSel === i
                  return (
                    <g key={i} className="nodecirc" onClick={() => { if (w) { setWorker(i, null); setSlotSel(i) } else setSlotSel(sel ? null : i) }}>
                      <circle cx={x} cy={WY} r="32" fill={w ? 'rgba(20,16,8,.9)' : 'rgba(10,8,4,.6)'}
                        stroke={sel ? '#fff' : w ? '#c9a227' : 'rgba(201,162,39,.4)'} strokeWidth={sel ? 2.5 : 1.5} strokeDasharray={w ? '0' : '5 5'} />
                      <text x={x} y={WY - 2} textAnchor="middle" fill={w ? '#e8c95a' : '#8d8266'} fontSize="10" fontFamily="Palatino,serif" letterSpacing="1">{w ? `HAND ${i + 1}` : sel ? 'CHOOSE…' : 'EMPTY'}</text>
                      <text x={x} y={WY + 13} textAnchor="middle" fill="#efe6d0" fontSize="10" fontFamily="Palatino,serif">{w ? short(w) : 'click roster'}</text>
                    </g>
                  )
                })}
                <text x="300" y="272" textAnchor="middle" fill="#8d8266" fontSize="11" fontFamily="Palatino,serif" fontStyle="italic">click a filled circle to release its model · click an empty circle, then a roster model to bind it</text>
              </svg>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '4px 0 8px' }}>
                <span className="via" style={{ margin: 0, alignSelf: 'center' }}>operator:</span>
                {['anthropic/claude-opus-4.8', 'anthropic/claude-sonnet-5'].map((m) => (
                  <button key={m} className="rost" style={{ width: 'auto', marginBottom: 0, ...(editing.operator === m ? { borderColor: '#e8c95a', color: '#e8c95a' } : {}) }}
                    onClick={() => setDelegators(delegators.map((d) => d.id === editing.id ? { ...d, operator: m } : d))}>{short(m)}</button>
                ))}
                <button className="rost" style={{ width: 'auto', marginBottom: 0 }} onClick={() => setDelegators(DEFAULTS)}>restore pantheon</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
