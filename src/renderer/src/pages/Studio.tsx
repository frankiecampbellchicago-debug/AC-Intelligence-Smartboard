import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { TerminalView } from '../components/Terminal'
import { openExternal, cn } from '../lib/util'
import { IconChevronLeft, IconExternal, IconRefresh, IconTerminal } from '../components/icons'

export function Studio(): React.JSX.Element {
  const projectId = useStore((s) => s.studioProjectId)
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))
  const setView = useStore((s) => s.setView)

  const [localPath, setLocalPath] = useState<string | null>(null)
  const [status, setStatus] = useState<'preparing' | 'ready' | 'error'>('preparing')
  const [errorMsg, setErrorMsg] = useState('')
  const [split, setSplit] = useState(0.5)
  const [dragging, setDragging] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Clone the repo (if needed) when the studio opens for a project.
  useEffect(() => {
    if (!project) return
    setStatus('preparing')
    setLocalPath(null)
    let cancelled = false
    void window.api.studio.prepareRepo(project.repoFullName).then((res) => {
      if (cancelled) return
      if (res.error || !res.localPath) {
        setStatus('error')
        setErrorMsg(res.error ?? 'Could not prepare repo')
      } else {
        setLocalPath(res.localPath)
        setStatus('ready')
      }
    })
    return () => {
      cancelled = true
    }
  }, [project?.id, project?.repoFullName])

  // Divider drag.
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent): void => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const f = (e.clientX - rect.left) / rect.width
      setSplit(Math.min(0.8, Math.max(0.2, f)))
    }
    const onUp = (): void => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  function back(): void {
    useStore.setState({ studioProjectId: null })
    setView('projects')
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No site selected — open a site’s <span className="mx-1 font-medium text-text">Edit</span>{' '}
        button.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-text"
        >
          <IconChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <IconTerminal className="h-4 w-4 text-violet" />
          <span className="font-semibold text-text">{project.name}</span>
        </div>
        <span className="truncate text-xs text-subtle">{localPath ?? 'preparing…'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Reload site
          </button>
          {project.liveUrl && (
            <button
              onClick={() => openExternal(project.liveUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
            >
              <IconExternal className="h-3.5 w-3.5" /> Open
            </button>
          )}
        </div>
      </div>

      {/* Split: terminal | live site */}
      <div ref={containerRef} className="relative flex min-h-0 flex-1">
        {/* Left — terminal */}
        <div style={{ width: `${split * 100}%` }} className="h-full shrink-0">
          {status === 'ready' && localPath ? (
            <TerminalView cwd={localPath} runClaude />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface px-6 text-center text-sm">
              {status === 'error' ? (
                <span className="text-red">Couldn’t prepare repo: {errorMsg}</span>
              ) : (
                <span className="text-muted">Cloning {project.repoFullName || project.name}…</span>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          onMouseDown={() => setDragging(true)}
          className={cn(
            'w-1.5 shrink-0 cursor-col-resize bg-border transition hover:bg-accent',
            dragging && 'bg-accent'
          )}
        />

        {/* Right — live site */}
        <div className="relative h-full min-w-0 flex-1 bg-bg">
          {project.liveUrl ? (
            <webview
              key={reloadKey}
              src={project.liveUrl}
              partition="studio"
              style={{ width: '100%', height: '100%', border: '0' }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-subtle">
              No live URL for this site
            </div>
          )}
          {/* Transparent capture layer so the webview doesn't swallow drag events. */}
          {dragging && <div className="absolute inset-0 z-50" />}
        </div>
      </div>
    </div>
  )
}
