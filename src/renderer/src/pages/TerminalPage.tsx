import { TerminalView } from '../components/Terminal'

/**
 * Standalone terminal opening at the sites workspace
 * (~/website-cookbook-sites). A general shell: run git, claude, npm, etc.
 */
export function TerminalPage(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2.5 text-xs text-muted">
        Shell at your sites workspace — run <code className="text-text">claude</code>,{' '}
        <code className="text-text">git</code>, <code className="text-text">npm</code>, anything.
      </div>
      <div className="min-h-0 flex-1">
        <TerminalView />
      </div>
    </div>
  )
}
