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
  className
}: {
  cwd?: string
  runClaude?: boolean
  className?: string
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

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
      const newId = await window.api.terminal.create({
        cwd,
        runClaude,
        cols: term.cols,
        rows: term.rows
      })
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
