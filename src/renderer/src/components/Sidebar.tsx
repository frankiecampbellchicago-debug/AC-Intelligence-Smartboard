import { useStore } from '../store/useStore'
import { useInbox } from '../store/useInbox'
import { cn } from '../lib/util'
import athenaBtn from '../assets/athena-btn.jpg'
import odinBtn from '../assets/odin-btn.jpg'
import {
  IconInbox,
  IconLeads,
  IconBook,
  IconGithub,
  IconSettings,
  IconLogout,
  IconGlobe,
  IconCheck
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
  | 'ops'
  | 'brain'
  | 'sessions'
  | 'athena'
  | 'odin'

type Item = { id: View; label: string; Svg: (p: { className?: string }) => React.JSX.Element }
type Group = { title: string; items: Item[] }

/* Grouped navigation — same views as before, organized by intent. */
const GROUPS: Group[] = [
  {
    title: 'Command',
    items: [
      { id: 'ops', label: 'Operations System', Svg: IconGlobe },
      { id: 'sessions', label: 'Session Coach', Svg: IconCheck }
    ]
  },
  {
    title: 'Operate',
    items: [
      { id: 'inbox', label: 'Inbox', Svg: IconInbox },
      { id: 'leads', label: 'Leads', Svg: IconLeads },
      { id: 'hub', label: 'GitHub', Svg: IconGithub }
    ]
  }
]

function NavRow({
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
        'group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[13.5px] font-medium transition duration-150',
        active
          ? 'bg-brand text-white shadow-[0_8px_24px_-10px_rgba(124,92,255,0.7)]'
          : 'text-muted hover:bg-white/[0.05] hover:text-text'
      )}
    >
      <Svg
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors duration-150',
          active ? 'text-white' : 'text-subtle group-hover:text-text'
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={cn(
            'tnum flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
            active ? 'bg-white/25 text-white' : 'bg-accent-soft text-accent'
          )}
        >
          {badge}
        </span>
      )}
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
    <aside className="flex w-[228px] shrink-0 flex-col border-r border-border bg-sidebar/70 backdrop-blur-2xl">
      {/* Drag strip clears the macOS traffic lights. */}
      <div className="drag-region h-9 w-full shrink-0" />

      {/* Brand */}
      <div className="no-drag flex items-center gap-2.5 px-4 pb-4 pt-1">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="brand-orbit h-[22px] w-[22px] shrink-0">
          <circle cx="12" cy="12" r="8" stroke="rgba(238,240,255,.85)" strokeWidth="1.5" />
          <circle cx="12" cy="4" r="2.1" fill="#a99bff" />
        </svg>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[14px] font-extrabold tracking-tight text-text">
            AC Intelligence
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-subtle">
            Smartboard
          </div>
        </div>
      </div>

      {/* ATHENA — Greek temple imagery, marble + gold. */}
      <div className="no-drag px-3 pb-2">
        <button
          onClick={() => setView('athena')}
          className="relative w-full overflow-hidden rounded-[4px] border px-3 py-2.5 text-left leading-none transition duration-200"
          style={{
            fontFamily: "'Palatino','Book Antiqua',Georgia,serif",
            backgroundImage: `linear-gradient(90deg, rgba(10,8,4,.9) 0%, rgba(10,8,4,.66) 55%, rgba(10,8,4,.42) 100%), url(${athenaBtn})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderColor: view === 'athena' ? '#e8c95a' : 'rgba(201,162,39,.4)',
            boxShadow: view === 'athena' ? '0 0 18px -4px rgba(201,162,39,.6)' : 'none'
          }}
        >
          <span className="block text-[13.5px] tracking-[0.26em]" style={{ color: '#f0d98a', textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>ATHENA</span>
          <span className="mt-0.5 block text-[8.5px] italic tracking-[0.06em]" style={{ color: 'rgba(240,226,190,.8)', textShadow: '0 1px 5px rgba(0,0,0,.9)' }}>the operator · ΑΘΗΝΑ</span>
        </button>
      </div>

      {/* ODIN — Norse runestones + aurora, cold steel + frost-blue. */}
      <div className="no-drag px-3 pb-2">
        <button
          onClick={() => setView('odin')}
          className="relative w-full overflow-hidden rounded-[4px] border px-3 py-2.5 text-left leading-none transition duration-200"
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            backgroundImage: `linear-gradient(90deg, rgba(5,9,15,.9) 0%, rgba(5,9,15,.66) 55%, rgba(5,9,15,.42) 100%), url(${odinBtn})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderColor: view === 'odin' ? '#8fd0ff' : 'rgba(120,160,210,.4)',
            boxShadow: view === 'odin' ? '0 0 18px -4px rgba(120,180,255,.6)' : 'none'
          }}
        >
          <span className="block text-[13.5px] font-bold tracking-[0.28em]" style={{ color: '#cfe6ff', textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>ODIN</span>
          <span className="mt-0.5 block text-[8.5px] tracking-[0.1em]" style={{ color: 'rgba(190,216,242,.85)', textShadow: '0 1px 5px rgba(0,0,0,.9)' }}>the seeker · ᛟᛞᛁᚾ</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="no-drag flex-1 space-y-5 overflow-y-auto px-3 py-1">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.2em] text-subtle">
              {g.title}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavRow
                  key={it.id}
                  label={it.label}
                  Svg={it.Svg}
                  active={view === it.id}
                  badge={badgeFor(it.id)}
                  onClick={() => setView(it.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Cookbook + Settings + user card */}
      <div className="no-drag space-y-1 px-3 pb-4 pt-2">
        <NavRow
          label="Cookbook"
          Svg={IconBook}
          active={view === 'wizard'}
          onClick={() => setView('wizard')}
        />
        <NavRow
          label="Settings"
          Svg={IconSettings}
          active={view === 'settings'}
          onClick={() => setView('settings')}
        />
        <div className="mt-2 flex items-center gap-2.5 rounded-[12px] border border-border bg-white/[0.03] px-3 py-2.5">
          <span className="bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white">
            K
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12.5px] font-semibold text-text">Kaiden</div>
            <div className="truncate text-[10px] text-subtle">Operator</div>
          </div>
          <button
            onClick={() => window.close()}
            title="Log out"
            className="text-subtle transition hover:text-text"
          >
            <IconLogout className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
