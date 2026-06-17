import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { useStore } from './store/useStore'
import { useTheme } from './lib/theme'
import { IconSun, IconMoon } from './components/icons'
import { cn } from './lib/util'
import { Dashboard } from './pages/Dashboard'
import { Wizard } from './pages/Wizard'
import { Projects } from './pages/Projects'
import { Resources } from './pages/Resources'
import { Settings } from './pages/Settings'
import { TerminalPage } from './pages/TerminalPage'
import { Studio } from './pages/Studio'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your website builds at a glance' },
  wizard: { title: 'Build Wizard', subtitle: 'The 7-level website cookbook' },
  projects: { title: 'Projects', subtitle: 'Every site you are building' },
  resources: { title: 'Resources', subtitle: 'Curated links from every level' },
  settings: { title: 'Settings', subtitle: 'Preferences and appearance' },
  terminal: { title: 'Terminal', subtitle: 'Code and edit your sites' },
  studio: { title: 'Studio', subtitle: 'Code on the left, live site on the right' }
}

// These views render edge-to-edge and manage their own scrolling/height.
const FULL_BLEED = new Set(['terminal', 'studio'])

function ThemeToggle(): React.JSX.Element {
  const { isDark, setPref } = useTheme()
  return (
    <button
      onClick={() => setPref(isDark ? 'light' : 'dark')}
      className="no-drag flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition hover:text-text"
      title={isDark ? 'Switch to light' : 'Switch to dark'}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  )
}

function Topbar(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const t = TITLES[view]
  return (
    <header className="drag-region flex items-center justify-between px-8 pb-4 pt-6">
      <div className="pl-16">
        <h1 className="text-xl font-bold text-text">{t.title}</h1>
        <p className="text-sm text-muted">{t.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="no-drag flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5">
          <div className="bg-brand flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white">
            K
          </div>
          <span className="text-sm font-medium text-text">Kaiden</span>
        </div>
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

  useEffect(() => {
    void (async () => {
      await hydrate()
      await checkGithub()
      // On the very first launch, auto-pull the user's GitHub sites so the
      // dashboard isn't empty. Subsequent syncs are manual (Settings / Projects).
      const st = useStore.getState()
      if (st.githubStatus?.connected && !localStorage.getItem('wc-autosynced')) {
        try {
          await st.syncFromGitHub()
        } finally {
          localStorage.setItem('wc-autosynced', '1')
        }
      }
    })()
  }, [hydrate, checkGithub])

  return (
    <div className="flex h-full overflow-hidden bg-bg text-text">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          className={cn(
            'min-h-0 flex-1',
            fullBleed ? 'overflow-hidden' : 'overflow-y-auto px-8 pb-8'
          )}
        >
          {!hydrated ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading your cookbook…
            </div>
          ) : (
            <>
              {view === 'dashboard' && <Dashboard />}
              {view === 'wizard' && <Wizard />}
              {view === 'projects' && <Projects />}
              {view === 'resources' && <Resources />}
              {view === 'settings' && <Settings />}
              {view === 'terminal' && <TerminalPage />}
              {view === 'studio' && <Studio />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
