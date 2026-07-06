import { useEffect } from 'react'
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
import { Dashboard } from './pages/Dashboard'
import { Wizard } from './pages/Wizard'
import { Projects } from './pages/Projects'
import { Settings } from './pages/Settings'
import { Studio } from './pages/Studio'
import { Ops } from './pages/Ops'
import { Sessions } from './pages/Sessions'
import ambient from './assets/app-ambient.jpg'

const FULL_BLEED = new Set(['studio'])

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
      className="no-drag flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/[0.04] text-muted backdrop-blur-md transition hover:border-border-strong hover:text-text"
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
    <header className="drag-region flex items-center justify-between gap-4 border-b border-border bg-bg/40 px-6 py-3 backdrop-blur-xl">
      <div className="no-drag flex min-w-0 flex-1 items-center gap-3">
        {canBack && (
          <button
            onClick={back}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted transition hover:border-border-strong hover:text-text"
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
            className="w-full rounded-[10px] border border-border bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-text outline-none backdrop-blur-md transition placeholder:text-subtle focus:border-accent focus:bg-white/[0.06]"
          />
        </div>
        <div className="hidden items-center gap-1.5 xl:flex">
          {CHIPS.map((c) => (
            <button
              key={c.cat}
              onClick={() => {
                setHubTab(c.cat)
                setView('hub')
              }}
              className="rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-text"
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
    <div className="relative flex h-full overflow-hidden text-text">
      {/* The aurora world — everything floats above it. */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <img src={ambient} alt="" className="h-full w-full object-cover" draggable={false} />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,7,13,.45) 0%, rgba(7,7,13,.62) 55%, rgba(7,7,13,.88) 100%)'
          }}
        />
      </div>

      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          className={cn(
            'min-h-0 flex-1',
            fullBleed ? 'overflow-hidden' : 'overflow-y-auto px-7 pb-7 pt-6'
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
              {view === 'dashboard'  && <Dashboard />}
              {view === 'wizard'     && <Wizard />}
              {view === 'projects'   && <Projects />}
              {view === 'settings'   && <Settings />}
              {view === 'studio'     && <Studio />}
              {view === 'ops'        && <Ops />}
              {view === 'sessions'   && <Sessions />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
