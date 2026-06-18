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
export function IconGithub({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.52-4.48-10-10-10z"
      />
    </svg>
  )
}
export function IconWhiteboard({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4M7 9h7M7 12.5h4" />
    </svg>
  )
}
export function IconBook({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 1 2-2h13M9 7h6" />
    </svg>
  )
}
export function IconLogout({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}
export function IconInbox({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
export function IconMail({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  )
}
export function IconReply({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2" />
    </svg>
  )
}
export function IconArchive({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  )
}
export function IconStar({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.9l1.1-6.5L2.6 9.8l6.5-.9z" />
    </svg>
  )
}
export function IconSend({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  )
}
export function IconBell({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}
export function IconHub({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="m10.2 10.2-3.8-3.8M13.8 10.2l3.8-3.8M10.2 13.8l-3.8 3.8M13.8 13.8l3.8 3.8" />
    </svg>
  )
}
export function IconSearch({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
export function IconBolt({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  )
}
export function IconLeads({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
export function IconPhone({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
export function IconGlobe({ className = base }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  )
}
