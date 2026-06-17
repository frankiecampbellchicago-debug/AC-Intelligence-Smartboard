import type { ReactNode } from 'react'
import type { ProjectStatus } from '@shared/types'
import { STATUS_LABELS } from '@shared/types'
import { cn } from '../lib/util'

export function Card({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-[var(--shadow)]',
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
    primary: 'bg-brand ring-brand text-white hover:opacity-95',
    ghost: 'text-muted hover:text-text hover:bg-bg',
    subtle: 'bg-bg text-text border border-border hover:border-border-strong',
    danger: 'text-red hover:bg-red/10'
  }[variant]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className
      )}
    >
      {children}
    </button>
  )
}
