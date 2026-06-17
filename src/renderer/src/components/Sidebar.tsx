import { useStore } from '../store/useStore'
import { cn } from '../lib/util'
import { Logo } from './Logo'
import {
  IconDashboard,
  IconWizard,
  IconProjects,
  IconResources,
  IconSettings,
  IconTerminal
} from './icons'

type View = 'dashboard' | 'wizard' | 'projects' | 'terminal' | 'resources' | 'settings'

const NAV: {
  id: View
  label: string
  color: string
  Icon: (p: { className?: string }) => React.JSX.Element
}[] = [
  { id: 'dashboard', label: 'Dashboard', color: 'var(--accent)', Icon: IconDashboard },
  { id: 'wizard', label: 'Build Wizard', color: 'var(--violet)', Icon: IconWizard },
  { id: 'projects', label: 'Projects', color: 'var(--emerald)', Icon: IconProjects },
  { id: 'terminal', label: 'Terminal', color: 'var(--pink)', Icon: IconTerminal },
  { id: 'resources', label: 'Resources', color: 'var(--amber)', Icon: IconResources },
  { id: 'settings', label: 'Settings', color: 'var(--cyan)', Icon: IconSettings }
]

export function Sidebar(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const projectCount = useStore((s) => s.projects.length)

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
      {/* Draggable top strip that clears the macOS traffic-light buttons. */}
      <div className="drag-region h-8 shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-2 no-drag">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-text">Website</div>
          <div className="text-brand text-[15px] font-bold">Cookbook</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ id, label, color, Icon }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active ? 'text-text' : 'text-muted hover:bg-bg hover:text-text'
              )}
              style={
                active
                  ? { background: `color-mix(in srgb, ${color} 14%, transparent)` }
                  : undefined
              }
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg transition"
                style={{
                  background: active
                    ? color
                    : `color-mix(in srgb, ${color} 14%, transparent)`,
                  color: active ? '#fff' : color
                }}
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <span>{label}</span>
              {id === 'projects' && projectCount > 0 && (
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: color }}
                >
                  {projectCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Help card */}
      <div className="bg-brand relative m-3 overflow-hidden rounded-2xl p-4 text-white">
        <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />
        <div className="relative">
          <div className="text-sm font-semibold">7 levels to mastery</div>
          <p className="mt-1 text-xs leading-relaxed text-white/80">
            Follow the cookbook from Raw Prompter to SEO. One level at a time.
          </p>
          <button
            onClick={() => setView('wizard')}
            className="mt-3 w-full rounded-lg bg-white/95 py-2 text-xs font-semibold text-[var(--violet)] transition hover:bg-white"
          >
            Open the wizard
          </button>
        </div>
      </div>
    </aside>
  )
}
