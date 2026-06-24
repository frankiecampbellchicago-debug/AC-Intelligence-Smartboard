import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { cn } from '../lib/util'

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * An xterm.js terminal wired to a node-pty shell in the main process.
 * Container must have a definite size (FitAddon measures it).
 */
export function TerminalView({
  cwd,
  runClaude,
  className,
  onReady
}: {
  cwd?: string
  runClaude?: boolean
  className?: string
  /** Called once the shell is live, with a function to write into it (e.g. drag-to-inject). */
  onReady?: (write: (data: string) => void) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  // Keep the latest onReady without it being an effect dependency (would recreate the pty).
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const term = new XTerm({
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "SF Mono", "Cascadia Code", monospace',
      cursorBlink: true,
      allowProposedApi: true,
      theme: {
        background: cssVar('--surface', '#171a22'),
        foreground: cssVar('--text', '#f3f4f7'),
        cursor: cssVar('--accent', '#5b85ff'),
        selectionBackground: 'rgba(120,140,255,0.30)'
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    try {
      fit.fit()
    } catch {
      /* not laid out yet */
    }

    let id: string | null = null
    let unsubData: (() => void) | null = null
    let unsubExit: (() => void) | null = null
    let disposed = false

    void (async () => {
      let newId: string
      try {
        newId = await window.api.terminal.create({ cwd, runClaude, cols: term.cols, rows: term.rows })
      } catch (err) {
        const msg = (err as Error).message
        if (msg === 'NO_BACKEND_URL') {
          term.writeln('\x1b[33mTerminal server not configured.\x1b[0m')
          term.writeln('Go to \x1b[1mSettings → Terminal Server URL\x1b[0m and paste your backend URL.')
          term.writeln('See the README in the \x1b[1mbackend/\x1b[0m folder for deployment instructions.')
        } else {
          term.writeln(`\x1b[31mFailed to connect: ${msg}\x1b[0m`)
        }
        return
      }
      if (disposed) {
        window.api.terminal.kill(newId)
        return
      }
      id = newId
      unsubData = window.api.terminal.onData(id, (d) => term.write(d))
      unsubExit = window.api.terminal.onExit(id, () =>
        term.writeln('\r\n\x1b[90m[process exited]\x1b[0m')
      )
      term.onData((d) => {
        if (id) window.api.terminal.write(id, d)
      })
      // Expose a writer so the page can inject text (drag-to-terminal).
      onReadyRef.current?.((data) => {
        if (id) window.api.terminal.write(id, data)
      })
      window.api.terminal.resize(id, term.cols, term.rows)
      term.focus()
    })()

    const refit = (): void => {
      try {
        fit.fit()
        if (id) window.api.terminal.resize(id, term.cols, term.rows)
      } catch {
        /* mid-teardown */
      }
    }
    const ro = new ResizeObserver(() => refit())
    ro.observe(host)
    window.addEventListener('resize', refit)

    return () => {
      disposed = true
      ro.disconnect()
      window.removeEventListener('resize', refit)
      unsubData?.()
      unsubExit?.()
      if (id) window.api.terminal.kill(id)
      term.dispose()
    }
  }, [cwd, runClaude])

  return (
    <div className={cn('h-full w-full overflow-hidden bg-surface p-3', className)}>
      <div ref={ref} className="h-full w-full" onClick={(e) => (e.currentTarget.firstElementChild as HTMLElement)?.focus()} />
    </div>
  )
}
