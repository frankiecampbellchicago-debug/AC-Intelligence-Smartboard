import { useEffect, useRef, useState } from 'react'
import { bridgeOnline, fetchStatus, fetchVaultTree } from '../lib/bridge'
import mural from '../assets/athena-mural.jpg'

/* ============================================================
   ATHENA — the operator deck. Deliberately NOT aurora: ivory,
   gold and aegean marble. One agent, many hands (delegators).
   ============================================================ */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
const keyOf = (): string => localStorage.getItem('wc-openrouter-key') || ''

/* Curated fleet — extend freely; any OpenRouter id works via Custom. */
const MODELS = [
  { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8', tag: 'operator' },
  { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', tag: 'fast operator' },
  { id: 'openai/gpt-5.3-codex', label: 'GPT-5.3 Codex', tag: 'code' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', tag: 'long context' },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', tag: 'reasoning' },
  { id: 'z-ai/glm-4.7', label: 'GLM 4.7', tag: 'cheap bulk' },
  { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek V3.1', tag: 'cheap code' },
  { id: 'perplexity/sonar-pro', label: 'Sonar Pro', tag: 'web research' }
]

interface Delegator {
  id: string; name: string; motto: string; operator: string
  workers: { model: string; role: string }[]; bestFor: string
}
/* The oracle's recommended fleets — one per discipline. */
const DEFAULT_DELEGATORS: Delegator[] = [
  { id: 'apollo', name: 'Apollo — Websites', motto: 'god of the arts', operator: 'anthropic/claude-opus-4.8', bestFor: 'Landing pages, redesigns, copy. Operator plans + judges taste; codex writes markup; Gemini reviews at distance.',
    workers: [{ model: 'openai/gpt-5.3-codex', role: 'write the HTML/CSS/components' }, { model: 'google/gemini-3.1-pro-preview', role: 'critique layout, a11y and copy' }] },
  { id: 'hephaestus', name: 'Hephaestus — Automations', motto: 'god of the forge', operator: 'anthropic/claude-opus-4.8', bestFor: 'Azure functions, scripts, pipelines. Codex drafts, DeepSeek writes tests, operator verifies against your freight runbooks.',
    workers: [{ model: 'openai/gpt-5.3-codex', role: 'draft implementation code' }, { model: 'deepseek/deepseek-chat-v3.1', role: 'write tests + find edge cases' }] },
  { id: 'delphi', name: 'Delphi — Deep Research', motto: 'the oracle', operator: 'anthropic/claude-sonnet-5', bestFor: 'Multi-source research with citations. Sonar searches live web; Kimi reasons over findings; operator synthesizes.',
    workers: [{ model: 'perplexity/sonar-pro', role: 'search the live web, return sourced facts' }, { model: 'moonshotai/kimi-k2.5', role: 'stress-test the findings, find contradictions' }] },
  { id: 'muses', name: 'Muses — Imagery', motto: 'the nine', operator: 'anthropic/claude-sonnet-5', bestFor: 'Image prompts + creative direction. Operator crafts art direction; workers vary the prompt; generate via Whiteboard.',
    workers: [{ model: 'google/gemini-3.1-pro-preview', role: 'expand into 3 detailed image prompts' }, { model: 'z-ai/glm-4.7', role: 'produce 3 alternative stylistic takes' }] }
]

interface Msg { role: 'user' | 'assistant'; content: string; via?: string; workings?: { model: string; out: string }[] }

async function llm(model: string, messages: { role: string; content: string }[], maxTokens = 4000): Promise<string> {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${keyOf()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter ${res.status}`)
  return data.choices?.[0]?.message?.content ?? ''
}

export function Athena(): React.JSX.Element {
  const [brain, setBrain] = useState('')
  const [brainOn, setBrainOn] = useState(false)
  const [mode, setMode] = useState<'single' | string>('single')
  const [model, setModel] = useState(MODELS[0].id)
  const [customModel, setCustomModel] = useState('')
  const [delegators, setDelegators] = useState<Delegator[]>(() => {
    try { return JSON.parse(localStorage.getItem('athena-delegators') || '') } catch { return DEFAULT_DELEGATORS }
  })
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem('athena-chat') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [showForge, setShowForge] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('athena-chat', JSON.stringify(msgs.slice(-60))) }, [msgs])
  useEffect(() => { localStorage.setItem('athena-delegators', JSON.stringify(delegators)) }, [delegators])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  /* The brain: pull Kaiden's world through the bridge. */
  useEffect(() => {
    void (async () => {
      if (!(await bridgeOnline())) return
      const [st, vt] = await Promise.all([fetchStatus(), fetchVaultTree()])
      const wip = st?.claude.wip.map((w) => `${w.project}: ${w.head.slice(0, 80)}`).join('\n') ?? ''
      const runs = st?.claude.runs.slice(0, 5).map((r) => `${r.skill} ${r.verdict}`).join('; ') ?? ''
      setBrain(
        `OPERATOR PROFILE: Kaiden Amaro runs AC Intelligence (AI consulting agency, partner Frankie Campbell; sites: ac-intelligence, 720tech, nexoria, dva) and freight automation for Source Alliance (AP-Banyan, International-UI on Azure; colleagues Greg, Aurora). He delegates outcomes in plain language, wants evidence before "done", values premium visuals and one-step-at-a-time safety on freight.\n` +
        `VAULT: ${vt?.notes ?? 0} notes (clients/, freight/ runbooks, wip/, runs/).\nACTIVE WIP:\n${wip}\nRECENT SKILL RUNS: ${runs}\n` +
        `Current pulse: ${st?.pulse.commits7 ?? '?'} commits/7d.`
      )
      setBrainOn(true)
    })()
  }, [])

  const activeDelegator = delegators.find((d) => d.id === mode) || null
  const effModel = customModel.trim() || model

  async function send(): Promise<void> {
    const q = input.trim()
    if (!q || busy) return
    setErr(null)
    setInput('')
    setMsgs((m) => [...m, { role: 'user', content: q }])
    const sys = `You are Athena — Kaiden's operator agent inside his AC Intelligence Operations System. Be direct, wise, concise. You have his context:\n${brain || '(bridge offline — no personal context loaded)'}`
    const history = msgs.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    try {
      if (!keyOf()) throw new Error('No OpenRouter key — add one in Settings → Image generation (same key powers Athena).')
      if (!activeDelegator) {
        setBusy(`consulting ${effModel.split('/')[1] || effModel}…`)
        const out = await llm(effModel, [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }])
        setMsgs((m) => [...m, { role: 'assistant', content: out, via: effModel }])
      } else {
        /* Delegation: operator plans → workers execute in parallel → operator synthesizes. */
        const d = activeDelegator
        setBusy(`${d.name.split('—')[0].trim()} is planning…`)
        const plan = await llm(d.operator, [
          { role: 'system', content: sys },
          { role: 'user', content: `Task: ${q}\n\nYou command these workers:\n${d.workers.map((w, i) => `${i + 1}. ${w.model} — ${w.role}`).join('\n')}\n\nWrite ONE focused brief per worker for this task (label "WORKER 1:", "WORKER 2:", …). Each brief must be self-contained. If the task is trivial and needs no delegation, reply exactly NO_DELEGATION followed by your direct answer.` }
        ])
        if (plan.trim().startsWith('NO_DELEGATION')) {
          setMsgs((m) => [...m, { role: 'assistant', content: plan.replace('NO_DELEGATION', '').trim(), via: d.operator }])
        } else {
          setBusy('workers at the forge…')
          const briefs = d.workers.map((_, i) => {
            const rx = new RegExp(`WORKER ${i + 1}:([\\s\\S]*?)(?=WORKER ${i + 2}:|$)`)
            return plan.match(rx)?.[1]?.trim() || `${q}\n\nYour role: ${d.workers[i].role}`
          })
          const outs = await Promise.all(
            d.workers.map((w, i) =>
              llm(w.model, [{ role: 'user', content: briefs[i] }], 3000).catch((e) => `⚠ ${w.model} failed: ${e.message}`)
            )
          )
          setBusy('Athena is weighing the counsel…')
          const finalOut = await llm(d.operator, [
            { role: 'system', content: sys },
            { role: 'user', content: `Original task: ${q}\n\nWorker results:\n${d.workers.map((w, i) => `--- ${w.model} (${w.role}) ---\n${outs[i]}`).join('\n\n')}\n\nSynthesize the best final answer. Verify claims against each other; note disagreements briefly; deliver the work product, not a meta-summary.` }
          ], 6000)
          setMsgs((m) => [...m, { role: 'assistant', content: finalOut, via: `${d.name} (${d.operator})`, workings: d.workers.map((w, i) => ({ model: w.model, out: outs[i] })) }])
        }
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="athena rise-in" style={{ position: 'relative' }}>
      {/* The pantheon fresco — fixed behind everything in this chamber. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} aria-hidden="true">
        <img src={mural} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,8,5,.82), rgba(10,8,5,.9) 40%, rgba(10,8,5,.96))' }} />
      </div>
      <style>{`
        .athena{--ivory:#f2ead9;--ivory-dim:#c9bfa8;--gold:#c9a227;--gold-hi:#e8c95a;--aegean:#0c1218;--marble:#11181f;--marble-2:#161f28;--line:rgba(201,162,39,.28);
          font-family:'Palatino','Palatino Linotype','Book Antiqua',Georgia,serif;color:var(--ivory);max-width:1060px;margin:0 auto}
        .athena .meander{height:8px;background:repeating-linear-gradient(90deg,var(--gold) 0 2px,transparent 2px 6px,var(--gold) 6px 8px,transparent 8px 14px);opacity:.55;border-radius:2px}
        .athena h1{font-size:34px;letter-spacing:.14em;font-weight:400;margin:10px 0 2px;color:var(--ivory)}
        .athena h1 b{color:var(--gold-hi);font-weight:400}
        .athena .sub{font-style:italic;color:var(--ivory-dim);font-size:14px;letter-spacing:.04em}
        .athena .col{background:linear-gradient(180deg,var(--marble-2),var(--marble));border:1px solid var(--line);border-radius:4px;position:relative}
        .athena .col::before,.athena .col::after{content:'';position:absolute;left:0;right:0;height:3px;background:var(--gold);opacity:.35}
        .athena .col::before{top:0}.athena .col::after{bottom:0}
        .athena .cap{font-size:10.5px;letter-spacing:.34em;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
        .athena select,.athena input[type=text],.athena textarea{background:var(--aegean);border:1px solid var(--line);color:var(--ivory);font-family:inherit;border-radius:3px;padding:8px 10px;font-size:14px;outline:none}
        .athena select:focus,.athena input:focus,.athena textarea:focus{border-color:var(--gold)}
        .athena .pill{border:1px solid var(--line);background:transparent;color:var(--ivory-dim);padding:5px 12px;border-radius:2px;font-size:12.5px;letter-spacing:.08em;cursor:pointer;font-family:inherit;transition:.2s}
        .athena .pill:hover{color:var(--ivory);border-color:var(--gold)}
        .athena .pill.on{background:linear-gradient(180deg,#3a2f10,#241d0a);color:var(--gold-hi);border-color:var(--gold)}
        .athena .msg{padding:14px 18px;border-radius:3px;margin:10px 0;line-height:1.65;font-size:15px;white-space:pre-wrap}
        .athena .msg.user{background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.18);margin-left:12%}
        .athena .msg.ai{background:var(--marble);border:1px solid var(--line);margin-right:6%}
        .athena .via{font-size:10.5px;letter-spacing:.22em;color:var(--gold);text-transform:uppercase;margin-bottom:6px}
        .athena details{margin-top:10px;font-size:12.5px;color:var(--ivory-dim)}
        .athena summary{cursor:pointer;color:var(--gold);letter-spacing:.1em;font-size:11px;text-transform:uppercase}
        .athena .go{background:linear-gradient(180deg,var(--gold-hi),var(--gold));color:#1a1406;border:0;font-family:inherit;font-size:14px;letter-spacing:.12em;padding:10px 26px;border-radius:2px;cursor:pointer;text-transform:uppercase}
        .athena .go:disabled{opacity:.5;cursor:wait}
        .athena .best{font-size:12.5px;color:var(--ivory-dim);font-style:italic;line-height:1.5}
      `}</style>

      {/* Pediment */}
      <div className="meander" />
      <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
        <svg width="46" height="34" viewBox="0 0 46 34" style={{ display: 'inline-block' }} aria-hidden="true">
          <circle cx="15" cy="14" r="7" fill="none" stroke="#c9a227" strokeWidth="1.4" />
          <circle cx="31" cy="14" r="7" fill="none" stroke="#c9a227" strokeWidth="1.4" />
          <circle cx="15" cy="14" r="2.4" fill="#e8c95a" /><circle cx="31" cy="14" r="2.4" fill="#e8c95a" />
          <path d="M20 22 L23 28 L26 22" fill="none" stroke="#c9a227" strokeWidth="1.4" />
          <path d="M8 8 L15 4 M38 8 L31 4" stroke="#c9a227" strokeWidth="1.4" />
        </svg>
        <h1>A T H E N A <b>· ΑΘΗΝΑ</b></h1>
        <div className="sub">operator of the house of Amaro — {brainOn ? 'the brain is with her' : 'awaiting the bridge (brain offline)'}</div>
      </div>
      <div className="meander" />

      {/* Council selector */}
      <div className="col" style={{ margin: '18px 0', padding: '14px 18px' }}>
        <div className="cap">Choose her form</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button className={`pill ${mode === 'single' ? 'on' : ''}`} onClick={() => setMode('single')}>Single Voice</button>
          {delegators.map((d) => (
            <button key={d.id} className={`pill ${mode === d.id ? 'on' : ''}`} onClick={() => setMode(d.id)}>{d.name.split('—')[0].trim()}</button>
          ))}
          <button className="pill" onClick={() => setShowForge(!showForge)} style={{ marginLeft: 'auto' }}>⚒ Forge Delegators</button>
        </div>
        {mode === 'single' && (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.tag}</option>)}
            </select>
            <input type="text" placeholder="or any openrouter id…" value={customModel} onChange={(e) => setCustomModel(e.target.value)} style={{ width: 230 }} />
          </div>
        )}
        {activeDelegator && (
          <div style={{ marginTop: 12 }}>
            <div className="best">“{activeDelegator.bestFor}”</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ivory-dim)' }}>
              Operator: <span style={{ color: 'var(--gold-hi)' }}>{activeDelegator.operator}</span>
              {activeDelegator.workers.map((w, i) => <span key={i}> · hand {i + 1}: <span style={{ color: 'var(--gold-hi)' }}>{w.model}</span></span>)}
            </div>
          </div>
        )}
      </div>

      {/* Forge — edit delegators */}
      {showForge && (
        <div className="col" style={{ margin: '0 0 18px', padding: '14px 18px' }}>
          <div className="cap">The Forge — shape your delegators</div>
          {delegators.map((d, di) => (
            <div key={d.id} style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
              <input type="text" value={d.name} style={{ width: '46%' }} onChange={(e) => setDelegators(delegators.map((x, i) => i === di ? { ...x, name: e.target.value } : x))} />
              <select value={d.operator} style={{ marginLeft: 8 }} onChange={(e) => setDelegators(delegators.map((x, i) => i === di ? { ...x, operator: e.target.value } : x))}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>op: {m.label}</option>)}
              </select>
              {d.workers.map((w, wi) => (
                <div key={wi} style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <select value={w.model} onChange={(e) => setDelegators(delegators.map((x, i) => i === di ? { ...x, workers: x.workers.map((y, j) => j === wi ? { ...y, model: e.target.value } : y) } : x))}>
                    {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input type="text" value={w.role} style={{ flex: 1 }} onChange={(e) => setDelegators(delegators.map((x, i) => i === di ? { ...x, workers: x.workers.map((y, j) => j === wi ? { ...y, role: e.target.value } : y) } : x))} />
                </div>
              ))}
            </div>
          ))}
          <button className="pill" style={{ marginTop: 10 }} onClick={() => setDelegators([...delegators, { id: `d${Date.now()}`, name: 'New — Delegator', motto: '', operator: MODELS[0].id, bestFor: '', workers: [{ model: MODELS[5].id, role: 'assist' }] }])}>+ new delegator</button>
          <button className="pill" style={{ marginLeft: 8, marginTop: 10 }} onClick={() => setDelegators(DEFAULT_DELEGATORS)}>restore the pantheon</button>
        </div>
      )}

      {/* Chat */}
      <div className="col" style={{ padding: '16px 20px', minHeight: 260 }}>
        <div className="cap">The Audience Chamber</div>
        {msgs.length === 0 && <div className="best" style={{ padding: '30px 0', textAlign: 'center' }}>Speak, and the goddess will answer — or dispatch her council.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.via && <div className="via">{m.via}</div>}
            {m.content}
            {m.workings && (
              <details>
                <summary>the workers' scrolls ({m.workings.length})</summary>
                {m.workings.map((w, j) => (
                  <div key={j} style={{ marginTop: 8, padding: 10, background: 'var(--aegean)', borderRadius: 3 }}>
                    <div className="via">{w.model}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{w.out.slice(0, 2500)}{w.out.length > 2500 ? '…' : ''}</div>
                  </div>
                ))}
              </details>
            )}
          </div>
        ))}
        {busy && <div className="best" style={{ padding: '8px 0' }}>⚡ {busy}</div>}
        {err && <div className="msg ai" style={{ borderColor: '#a33', color: '#e8a0a0' }}>{err}</div>}
        <div ref={endRef} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <textarea
            rows={2} style={{ flex: 1, resize: 'vertical' }} value={input}
            placeholder={activeDelegator ? `Give ${activeDelegator.name.split('—')[0].trim()} a task…` : 'Ask Athena…'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          />
          <button className="go" onClick={() => void send()} disabled={!!busy}>Send</button>
        </div>
      </div>
      <div className="meander" style={{ margin: '18px 0 6px' }} />
    </div>
  )
}
