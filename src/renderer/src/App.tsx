import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { useStore } from './store/useStore'
import {
  IconChevronLeft,
  IconSearch,
  IconBell,
  IconSettings
} from './components/icons'
import type { ProjectCategory } from '@shared/types'
import { cn } from './lib/util'
import { Hub } from './pages/Hub'
import { Inbox } from './pages/Inbox'
import { Leads } from './pages/Leads'
import { Whiteboard } from './pages/Whiteboard'
import { Dashboard } from './pages/Dashboard'
import { Wizard } from './pages/Wizard'
import { Projects } from './pages/Projects'
import { Resources } from './pages/Resources'
import { Settings } from './pages/Settings'
import { TerminalPage } from './pages/TerminalPage'
import { Studio } from './pages/Studio'

const FULL_BLEED = new Set(['terminal', 'studio'])

function CircleBtn({
  onClick,
  title,
  children
}: {
  onClick?: () => void
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className="no-drag flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition hover:text-text"
    >
      {children}
    </button>
  )
}

function WindowControls(): React.JSX.Element | null {
  if (window.api.platform !== 'win32') return null
  return (
    <div className="no-drag flex items-center">
      <button
        onClick={() => window.api.window.minimize()}
        title="Minimize"
        className="flex h-9 w-11 items-center justify-center text-muted transition hover:bg-white/10 hover:text-text"
      >
        <svg width="11" height="1" viewBox="0 0 11 1" fill="currentColor">
          <rect width="11" height="1" />
        </svg>
      </button>
      <button
        onClick={() => window.api.window.maximize()}
        title="Maximize"
        className="flex h-9 w-11 items-center justify-center text-muted transition hover:bg-white/10 hover:text-text"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="0.5" y="0.5" width="9" height="9" />
        </svg>
      </button>
      <button
        onClick={() => window.api.window.close()}
        title="Close"
        className="flex h-9 w-11 items-center justify-center text-muted transition hover:bg-red-500 hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  )
}

const CHIPS: { label: string; cat: ProjectCategory }[] = [
  { label: 'Websites', cat: 'website' },
  { label: 'Automations', cat: 'automation' },
  { label: 'Dashboards', cat: 'dashboard' },
  { label: 'Skills', cat: 'skill' },
  { label: 'Assistants', cat: 'assistant' }
]

function Topbar(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const selectedProjectId = useStore((s) => s.selectedProjectId)
  const topQuery = useStore((s) => s.topQuery)
  const setTopQuery = useStore((s) => s.setTopQuery)
  const setHubTab = useStore((s) => s.setHubTab)
  const canBack = Boolean(selectedProjectId) || view === 'studio'

  function back(): void {
    if (selectedProjectId) useStore.setState({ selectedProjectId: null })
    else if (view === 'studio') setView('hub')
  }

  return (
    <header className="drag-region flex items-center justify-between gap-4 px-6 pb-3 pt-5">
      <div className="no-drag flex min-w-0 flex-1 items-center gap-3">
        {canBack && (
          <button
            onClick={back}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-text"
          >
            <IconChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={topQuery}
            onChange={(e) => setTopQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setView('hub')
            }}
            placeholder="Search projects…"
            className="w-full rounded-full border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div className="hidden items-center gap-1.5 xl:flex">
          <span className="text-xs text-subtle">In:</span>
          {CHIPS.map((c) => (
            <button
              key={c.cat}
              onClick={() => {
                setHubTab(c.cat)
                setView('hub')
              }}
              className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:border-text/40 hover:text-text"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-2">
        <CircleBtn title="Notifications">
          <IconBell className="h-[18px] w-[18px]" />
        </CircleBtn>
        <CircleBtn onClick={() => setView('settings')} title="Settings">
          <IconSettings className="h-[18px] w-[18px]" />
        </CircleBtn>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-[var(--ink-fg)]">
          K
        </div>
      </div>
      <WindowControls />
    </header>
  )
}

export default function App(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const hydrate = useStore((s) => s.hydrate)
  const hydrated = useStore((s) => s.hydrated)
  const checkGithub = useStore((s) => s.checkGithub)
  const fullBleed = FULL_BLEED.has(view)

  const [termMounted, setTermMounted] = useState(false)
  useEffect(() => {
    if (view === 'terminal') setTermMounted(true)
  }, [view])

  useEffect(() => {
    void (async () => {
      await hydrate()
      await checkGithub()
      const st = useStore.getState()
      if (st.githubStatus?.connected && !localStorage.getItem('wc-autosynced-v6')) {
        try {
          await st.syncFromGitHub()
        } finally {
          localStorage.setItem('wc-autosynced-v6', '1')
        }
      }
    })()
  }, [hydrate, checkGithub])

  return (
    <div className="flex h-full overflow-hidden bg-sidebar text-text">
      <Sidebar />
      <div className="my-3 mr-3 ml-1 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_14px_48px_rgba(0,0,0,0.5)]">
        <Topbar />
        <main
          className={cn(
            'min-h-0 flex-1',
            fullBleed ? 'overflow-hidden' : 'overflow-y-auto px-6 pb-6'
          )}
        >
          {!hydrated ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading your dashboard…
            </div>
          ) : (
            <>
              {view === 'hub'        && <Hub />}
              {view === 'inbox'      && <Inbox />}
              {view === 'leads'      && <Leads />}
              {view === 'whiteboard' && <Whiteboard />}
              {view === 'dashboard'  && <Dashboard />}
              {view === 'wizard'     && <Wizard />}
              {view === 'projects'   && <Projects />}
              {view === 'resources'  && <Resources />}
              {view === 'settings'   && <Settings />}
              {view === 'studio'     && <Studio />}
              {termMounted && (
                <div className={cn('h-full', view === 'terminal' ? '' : 'hidden')}>
                  <TerminalPage />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
