import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useWhiteboard } from '../store/useWhiteboard'
import { TerminalView } from '../components/Terminal'
import { openExternal, cn } from '../lib/util'
import {
  IconGlobe,
  IconGit,
  IconExternal,
  IconRefresh,
  IconPlus,
  IconTerminal,
  IconWizard,
  IconWhiteboard
} from '../components/icons'

/**
 * Standalone terminal at the sites workspace (~/website-cookbook-sites), plus a
 * "Websites" menu: while you work in the shell you can pop any active site into
 * a live preview alongside it, and jump to its GitHub repo. The TerminalView is
 * never unmounted when the preview toggles, so the shell session is preserved.
 */
export function TerminalPage(): React.JSX.Element {
  const projects = useStore((s) => s.projects)

  const sites = useMemo(
    () =>
      projects
        .filter((p) => p.liveUrl && p.syncState !== 'orphaned')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  )

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [split, setSplit] = useState(0.5)
  const [dragging, setDragging] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  // Multiple terminal sessions — each TerminalView stays mounted so its shell survives tab switches.
  const [terms, setTerms] = useState<{ id: string; n: number }[]>([{ id: 'term-1', n: 1 }])
  const [activeTerm, setActiveTerm] = useState('term-1')
  const nextN = useRef(2)
  // Per-session pty writers, so a dragged idea can be injected into the active terminal.
  const writersRef = useRef<Record<string, (d: string) => void>>({})
  const wbItems = useWhiteboard((s) => s.items)
  const hydrateWB = useWhiteboard((s) => s.hydrate)
  const [wbOpen, setWbOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const selected = sites.find((p) => p.id === previewId) ?? null

  // Measure the preview pane so desktop mode can render at a real desktop width and scale to fit.
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const update = (): void => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selected])
  // If the selected site disappears (e.g. after a sync), drop the preview.
  useEffect(() => {
    if (previewId && !selected) setPreviewId(null)
  }, [previewId, selected])

  // Load saved whiteboard ideas so they can be dragged into the terminal.
  useEffect(() => {
    void hydrateWB()
  }, [hydrateWB])

  // Divider drag (mirrors the Studio split).
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent): void => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const f = (e.clientX - rect.left) / rect.width
      setSplit(Math.min(0.8, Math.max(0.25, f)))
    }
    const onUp = (): void => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  function openSite(id: string): void {
    setPreviewId(id)
    setMenuOpen(false)
    setReloadKey((k) => k + 1)
    // Give the preview the bulk of the width so the desktop layout is comfortably visible.
    setSplit(0.36)
  }

  function newTerm(): void {
    const n = nextN.current++
    const id = `term-${n}`
    setTerms((t) => [...t, { id, n }])
    setActiveTerm(id)
  }

  function closeTerm(id: string): void {
    if (terms.length <= 1) return
    const idx = terms.findIndex((x) => x.id === id)
    const rest = terms.filter((x) => x.id !== id)
    setTerms(rest)
    delete writersRef.current[id]
    if (id === activeTerm) setActiveTerm((rest[idx - 1] ?? rest[0]).id)
  }

  function inject(text: string): void {
    writersRef.current[activeTerm]?.(text)
  }

  // Drop a whiteboard idea/image onto the terminal → inject a `claude "<prompt>"` command.
  async function onDropIdea(e: React.DragEvent): Promise<void> {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/wb-id')
    const item = id ? useWhiteboard.getState().items.find((i) => i.id === id) : null
    if (item) {
      if (item.type === 'image' && item.dataUrl) {
        const res = await window.api.image.save(item.dataUrl, item.prompt.slice(0, 24))
        const ref = res.path ? ` (reference image saved at ${res.path})` : ''
        inject(`claude ${JSON.stringify(item.prompt + ref)}`)
      } else {
        inject(`claude ${JSON.stringify(item.prompt)}`)
      }
      return
    }
    const txt = e.dataTransfer.getData('text/plain')
    if (txt) inject(`claude ${JSON.stringify(txt)}`)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        {selected ? (
          <div className="flex min-w-0 items-center gap-2">
            <IconGlobe className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate text-sm font-semibold text-text">{selected.name}</span>
            <span className="hidden truncate text-xs text-subtle sm:inline">{selected.liveUrl}</span>
          </div>
        ) : (
          <div className="min-w-0 text-xs text-muted">
            Shell at your sites workspace — run <code className="text-text">claude</code>,{' '}
            <code className="text-text">git</code>, <code className="text-text">npm</code>, anything.
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Whiteboard panel toggle */}
          <button
            onClick={() => setWbOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
              wbOpen
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border bg-surface text-text hover:border-accent hover:text-accent'
            )}
          >
            <IconWhiteboard className="h-3.5 w-3.5" /> Whiteboard
            {wbItems.length > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  wbOpen ? 'bg-accent text-white' : 'bg-bg text-subtle'
                )}
              >
                {wbItems.length}
              </span>
            )}
          </button>
          {selected && (
            <>
              {/* Desktop / Mobile preview toggle */}
              <div className="flex rounded-lg border border-border bg-bg p-0.5">
                {(['desktop', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition',
                      device === d ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {selected.repoUrl && (
                <button
                  onClick={() => openExternal(selected.repoUrl)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
                >
                  <IconGit className="h-3.5 w-3.5" /> Repo
                </button>
              )}
              <button
                onClick={() => openExternal(selected.liveUrl)}
                title="Open the live site in your browser"
                className="bg-ink inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-fg)] transition hover:opacity-90"
              >
                <IconExternal className="h-3.5 w-3.5" /> Launch live
              </button>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
              >
                <IconRefresh className="h-3.5 w-3.5" /> Reload
              </button>
              <button
                onClick={() => setPreviewId(null)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition hover:text-red"
              >
                Close
              </button>
            </>
          )}

          {/* Websites menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="bg-brand inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95"
            >
              <IconGlobe className="h-3.5 w-3.5" /> Websites
              <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
                {sites.length}
              </span>
            </button>
            {menuOpen && (
              <>
                {/* click-away */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow)]">
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                    Active websites
                  </div>
                  {sites.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted">
                      No live sites yet — sync GitHub or add a site with a live URL.
                    </div>
                  ) : (
                    sites.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-bg',
                          s.id === previewId && 'bg-accent-soft'
                        )}
                      >
                        <button
                          onClick={() => openSite(s.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-sm font-medium text-text">{s.name}</div>
                          <div className="truncate text-[11px] text-subtle">{s.liveUrl}</div>
                        </button>
                        {s.repoUrl && (
                          <button
                            onClick={() => openExternal(s.repoUrl)}
                            title="Open GitHub repo"
                            className="shrink-0 rounded-md p-1 text-subtle transition hover:text-accent"
                          >
                            <IconGit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openExternal(s.liveUrl)}
                          title="Open live site in browser"
                          className="shrink-0 rounded-md p-1 text-subtle transition hover:text-accent"
                        >
                          <IconExternal className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body: optional whiteboard panel + terminal (always mounted) + optional live-site preview */}
      <div className="flex min-h-0 flex-1">
        {wbOpen && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
                Whiteboard · {wbItems.length}
              </span>
              <button onClick={() => setWbOpen(false)} title="Hide" className="text-subtle hover:text-text">
                ✕
              </button>
            </div>
            {wbItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted">
                No saves yet — create ideas or images on the Whiteboard.
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {wbItems.map((it) => (
                  <div
                    key={it.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/wb-id', it.id)
                      e.dataTransfer.setData('text/plain', it.prompt)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    title="Drag into the terminal"
                    className="cursor-grab overflow-hidden rounded-lg border border-border bg-bg transition hover:border-accent active:cursor-grabbing"
                  >
                    {it.type === 'image' && it.dataUrl && (
                      <img src={it.dataUrl} alt="" className="aspect-video w-full object-cover" />
                    )}
                    <div className="flex items-start gap-1.5 p-2">
                      {it.type === 'idea' && (
                        <IconWizard className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                      )}
                      <span className="line-clamp-2 text-[11px] text-text">{it.prompt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="shrink-0 border-t border-border px-3 py-2 text-[10px] text-subtle">
              Drag any save into the terminal →
            </div>
          </aside>
        )}
        <div ref={containerRef} className="relative flex min-h-0 flex-1">
        <div
          style={{ width: selected ? `${split * 100}%` : '100%' }}
          className="flex h-full shrink-0 flex-col"
        >
          {/* Terminal tabs */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-1.5">
            {terms.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTerm(t.id)}
                className={cn(
                  'group flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                  t.id === activeTerm
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-bg hover:text-text'
                )}
              >
                <IconTerminal className="h-3.5 w-3.5" />
                Terminal {t.n}
                {terms.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTerm(t.id)
                    }}
                    title="Close terminal"
                    className="ml-0.5 -mr-1 flex h-4 w-4 items-center justify-center rounded text-subtle transition hover:text-red"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={newTerm}
              title="New terminal"
              className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-bg hover:text-text"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>

          {/* Terminal sessions — all mounted, only the active one visible. Drop zone for ideas. */}
          <div
            className="relative min-h-0 flex-1"
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(e) => void onDropIdea(e)}
          >
            {terms.map((t) => (
              <div key={t.id} className={cn('absolute inset-0', t.id === activeTerm ? '' : 'hidden')}>
                <TerminalView
                  onReady={(w) => {
                    writersRef.current[t.id] = w
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <>
            <div
              onMouseDown={() => setDragging(true)}
              className={cn(
                'w-1.5 shrink-0 cursor-col-resize bg-border transition hover:bg-accent',
                dragging && 'bg-accent'
              )}
            />
            <div ref={previewRef} className="relative h-full min-w-0 flex-1 overflow-hidden bg-bg">
              {device === 'desktop' ? (
                size.w > 0 && size.h > 0 ? (
                  (() => {
                    const DESKTOP_W = 1280
                    const scale = Math.min(1, size.w / DESKTOP_W)
                    return (
                      <iframe
                        key={`${selected.id}:${reloadKey}:desktop`}
                        src={selected.liveUrl}
                        title={selected.name}
                        style={{
                          width: `${DESKTOP_W}px`,
                          height: `${size.h / scale}px`,
                          border: 0,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left'
                        }}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    )
                  })()
                ) : (
                  <div className="h-full w-full" />
                )
              ) : (
                <div className="flex h-full justify-center overflow-hidden bg-surface-2">
                  <iframe
                    key={`${selected.id}:${reloadKey}:mobile`}
                    src={selected.liveUrl}
                    title={selected.name}
                    style={{ width: '390px', height: '100%', border: 0 }}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              )}
              {/* Capture layer so the webview doesn't swallow divider drags. */}
              {dragging && <div className="absolute inset-0 z-50" />}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
