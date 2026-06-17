import type { ReactNode } from 'react'
import type { ProjectCategory, ProjectStatus } from '@shared/types'
import { CATEGORY_LABELS, PROJECT_CATEGORIES, STATUS_LABELS } from '@shared/types'
import { cn } from '../lib/util'

export function Card({
  children,
  className,
  interactive = true
}: {
  children: ReactNode
  className?: string
  /** Hover "pop" lift. Defaults on; disable for modals/static containers. */
  interactive?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-[var(--shadow)] transition duration-200',
        interactive &&
          'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_14px_34px_-10px_rgba(20,30,48,0.22)]',
        className
      )}
    >
      {children}
    </div>
  )
}

const STATUS_STYLES: Record<ProjectStatus, { dot: string; text: string; bg: string }> = {
  planning: { dot: 'var(--text-subtle)', text: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-subtle) 14%, transparent)' },
  building: { dot: 'var(--amber)', text: 'var(--amber)', bg: 'color-mix(in srgb, var(--amber) 16%, transparent)' },
  review: { dot: 'var(--purple)', text: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 16%, transparent)' },
  shipped: { dot: 'var(--green)', text: 'var(--green)', bg: 'color-mix(in srgb, var(--green) 16%, transparent)' }
}

export function StatusBadge({ status }: { status: ProjectStatus }): React.JSX.Element {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {STATUS_LABELS[status]}
    </span>
  )
}

/** Per-category accent color, reused by the badge, hub tabs, and dashboard. */
export const CATEGORY_COLOR: Record<ProjectCategory, string> = {
  website: 'var(--emerald)',
  automation: 'var(--violet)',
  dashboard: 'var(--cyan)',
  skill: 'var(--amber)',
  assistant: 'var(--indigo)',
  other: 'var(--text-subtle)'
}

export function CategoryBadge({
  category,
  className
}: {
  category: ProjectCategory
  className?: string
}): React.JSX.Element {
  const color = CATEGORY_COLOR[category]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        className
      )}
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {CATEGORY_LABELS[category]}
    </span>
  )
}

/** Inline dropdown to reassign a project's category. Stops row-click propagation. */
export function CategorySelect({
  value,
  onChange,
  className
}: {
  value: ProjectCategory
  onChange: (c: ProjectCategory) => void
  className?: string
}): React.JSX.Element {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as ProjectCategory)}
      className={cn(
        'rounded-lg border border-border bg-bg px-2 py-1 text-xs font-medium text-text outline-none focus:border-accent',
        className
      )}
    >
      {PROJECT_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABELS[c]}
        </option>
      ))}
    </select>
  )
}

export function LevelPill({
  level,
  className
}: {
  level: number
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent',
        className
      )}
    >
      L{level}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className,
  disabled
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}): React.JSX.Element {
  const styles = {
    primary: 'bg-ink text-[var(--ink-fg)] hover:opacity-90',
    ghost: 'text-muted hover:text-text hover:bg-bg',
    subtle: 'bg-surface text-text border border-border-strong hover:border-text/40',
    danger: 'text-red hover:bg-red/10'
  }[variant]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className
      )}
    >
      {children}
    </button>
  )
}
