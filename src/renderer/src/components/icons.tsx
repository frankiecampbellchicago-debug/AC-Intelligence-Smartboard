interface IconProps {
  className?: string
}
const base = 'h-[18px] w-[18px]'
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export function IconDashboard({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}
export function IconWizard({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
      <path d="m13 3 2.5 5.5L21 11l-5.5 2.5L13 19l-2.5-5.5L5 11l5.5-2.5z" />
    </svg>
  )
}
export function IconProjects({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
export function IconResources({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19a2 2 0 0 0 2 2h12" />
    </svg>
  )
}
export function IconSettings({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 2.6 14H2.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 2.6V2.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9h.09a2 2 0 0 1 0 4H19.4z" />
    </svg>
  )
}
export function IconSun({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
export function IconMoon({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
export function IconPlus({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
export function IconExternal({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}
export function IconFolder({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
export function IconGit({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="9" r="2.5" />
      <path d="M6 8.5v7M18 11.5c0 3-3 3.5-6 3.5" />
    </svg>
  )
}
export function IconTrash({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}
export function IconCheck({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
export function IconChevronLeft({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
export function IconAlert({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  )
}
export function IconTerminal({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  )
}
export function IconCode({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
    </svg>
  )
}
export function IconRefresh({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
    </svg>
  )
}
