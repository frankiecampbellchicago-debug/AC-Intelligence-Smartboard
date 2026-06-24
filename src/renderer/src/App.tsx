import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { useInbox } from './store/useInbox'
import { useTheme } from './lib/theme'
import { IconSearch } from './components/icons'
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

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'hub',       label: 'Projects' },
  { id: 'inbox',     label: 'Inbox' },
  { id: 'leads',     label: 'Leads' },
  { id: 'resources', label: 'Resources' },
  { id: 'wizard',    label: 'Cookbook' },
  { id: 'whiteboard',label: 'Whiteboard' },
  { id: 'terminal',  label: 'Terminal' },
  { id: 'settings',  label: 'Settings' },
] as const

type NavId = typeof NAV_ITEMS[number]['id']

function WindowControls(): React.JSX.Element | null {
  if (window.api.platform !== 'win32') return null
  return (
    <div className="flex items-center border-l border-border ml-4 pl-4">
      <button
        onClick={() => window.api.window.minimize()}
        title="Minimize"
        className="flex h-8 w-9 items-center justify-center text-muted transition hover:bg-black/5 hover:text-text"
      >
        <svg width="11" height="1" viewBox="0 0 11 1" fill="currentColor"><rect width="11" height="1" /></svg>
      </button>
      <button
        onClick={() => window.api.window.maximize()}
        title="Maximize"
        className="flex h-8 w-9 items-center justify-center text-muted transition hover:bg-black/5 hover:text-text"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="0.5" y="0.5" width="9" height="9" />
        </svg>
      </button>
      <button
        onClick={() => window.api.window.close()}
        title="Close"
        className="flex h-8 w-9 items-center justify-center text-muted transition hover:bg-red-500 hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  )
}

function TopNav(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const { isDark, setPref } = useTheme()
  const topQuery = useStore((s) => s.topQuery)
  const setTopQuery = useStore((s) => s.setTopQuery)
  const unreadMail = useInbox((s) => s.messages.filter((m) => m.folder === 'inbox' && !m.read).length)

  return (
    <header className="drag-region grid shrink-0 grid-cols-[200px_180px_1fr_auto] gap-6 border-b border-border px-8 py-5">
      {/* Col 1: Brand */}
      <div className="no-drag flex items-center">
        <button onClick={() => setView('dashboard')} className="text-left">
          <div className="text-[16px] font-black leading-none tracking-tight text-text">
            AC Intelligence
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
            Smartboard
          </div>
        </button>
      </div>

      {/* Col 2: Nav links */}
      <nav className="no-drag flex flex-col justify-center gap-0.5">
        {NAV_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id as NavId)}
            className={cn(
              'flex items-center gap-1.5 text-left text-sm transition',
              view === id ? 'font-semibold text-text' : 'text-muted hover:text-text'
            )}
          >
            {label}
            {id === 'inbox' && unreadMail > 0 && (
              <span className="text-[10px] font-bold text-accent">({unreadMail})</span>
            )}
          </button>
        ))}
      </nav>

      {/* Col 3: About blurb */}
      <div className="flex items-center">
        <div className="max-w-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text">
            About AC Intelligence
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            AI-powered smartboard for building and managing web projects.
            Connect GitHub, generate images, track leads, and ship faster.
          </p>
        </div>
      </div>

      {/* Col 4: Search + theme + window controls */}
      <div className="no-drag flex items-center gap-4">
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setPref(isDark ? 'light' : 'dark')}
            className="text-xs text-muted transition hover:text-text"
          >
            {isDark ? '◑ Light' : '◐ Dark'}
          </button>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={topQuery}
              onChange={(e) => setTopQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setView('hub') }}
              placeholder="Search…"
              className="w-36 border-b border-border bg-transparent pb-1 pl-5 pr-2 text-xs text-text outline-none placeholder:text-subtle focus:border-text/40"
            />
          </div>
        </div>
        <WindowControls />
      </div>
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
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <TopNav />
      <main
        className={cn(
          'min-h-0 flex-1',
          fullBleed
            ? 'overflow-hidden'
            : view === 'dashboard'
              ? 'overflow-y-auto px-8 pb-10 pt-6'
              : 'overflow-y-auto px-8 pb-10 pt-8'
        )}
      >
        {!hydrated ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading…
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
  )
}
