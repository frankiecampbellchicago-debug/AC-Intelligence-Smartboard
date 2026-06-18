import { useStore } from '../store/useStore'
import { useInbox } from '../store/useInbox'
import { cn } from '../lib/util'
import {
  IconDashboard,
  IconTerminal,
  IconWhiteboard,
  IconInbox,
  IconLeads,
  IconResources,
  IconBook,
  IconGithub,
  IconSettings,
  IconLogout
} from './icons'

type View =
  | 'hub'
  | 'dashboard'
  | 'inbox'
  | 'leads'
  | 'whiteboard'
  | 'wizard'
  | 'projects'
  | 'terminal'
  | 'resources'
  | 'settings'

type Item = { id: View; label: string; Svg: (p: { className?: string }) => React.JSX.Element }

// One flat list — no group separation. Build Wizard → terminal; Cookbook → the 7-level guide.
const NAV: Item[] = [
  { id: 'dashboard', label: 'Dashboard', Svg: IconDashboard },
  { id: 'terminal', label: 'Build Wizard', Svg: IconTerminal },
  { id: 'whiteboard', label: 'Whiteboard', Svg: IconWhiteboard },
  { id: 'inbox', label: 'Inbox', Svg: IconInbox },
  { id: 'leads', label: 'Leads', Svg: IconLeads },
  { id: 'resources', label: 'Resources', Svg: IconResources },
  { id: 'wizard', label: 'Cookbook', Svg: IconBook },
  { id: 'hub', label: 'GitHub', Svg: IconGithub },
  { id: 'settings', label: 'Settings', Svg: IconSettings }
]

// Uniform icon treatment — every icon the same size and color, no opacity mismatches.
const ICON_CLASS = 'h-[22px] w-[22px] text-white/60'

function NavTile({
  label,
  Svg,
  active,
  badge,
  onClick
}: {
  label: string
  Svg: (p: { className?: string }) => React.JSX.Element
  active: boolean
  badge?: number
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 transition',
        active ? 'bg-white/[0.1]' : 'hover:bg-white/[0.05]'
      )}
    >
      <span className="relative">
        <Svg className={ICON_CLASS} />
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-[var(--sidebar)]">
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          'text-center text-[10px] font-medium leading-tight',
          active ? 'text-white' : 'text-white/55'
        )}
      >
        {label}
      </span>
    </button>
  )
}

export function Sidebar(): React.JSX.Element {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const projectCount = useStore((s) => s.projects.length)
  // Live unread count — recomputes whenever a message is read/archived/etc.
  const unreadMail = useInbox((s) => s.messages.filter((m) => m.folder === 'inbox' && !m.read).length)

  const badgeFor = (id: View): number | undefined =>
    id === 'hub' ? projectCount : id === 'inbox' ? unreadMail : undefined

  return (
    <aside className="flex w-[104px] flex-col bg-sidebar">
      {/* Drag strip clears the macOS traffic lights. */}
      <div className="drag-region h-8 w-full shrink-0" />

      {/* Compact wordmark */}
      <div className="no-drag px-2 pb-2 pt-1 text-center">
        <div className="text-[15px] font-extrabold leading-none tracking-tight text-white">
          AC<span className="text-[var(--accent)]">.</span>
        </div>
        <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/40">
          Intelligence
        </div>
      </div>

      {/* Nav */}
      <nav className="no-drag flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1">
        {NAV.map((it) => (
          <NavTile
            key={it.id}
            label={it.label}
            Svg={it.Svg}
            active={view === it.id}
            badge={badgeFor(it.id)}
            onClick={() => setView(it.id)}
          />
        ))}
      </nav>

      {/* Log out (closes the window) */}
      <div className="no-drag px-2 pb-3 pt-1">
        <button
          onClick={() => window.close()}
          className="flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
        >
          <IconLogout className={ICON_CLASS} />
          <span className="text-[10px] font-medium leading-tight">Log out</span>
        </button>
      </div>
    </aside>
  )
}
