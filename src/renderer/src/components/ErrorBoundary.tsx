import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render/hydration failures so a corrupt store or a component bug
 * shows a recoverable screen instead of a blank white window.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center bg-bg p-8">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red/10 text-2xl">
            ⚠️
          </div>
          <h1 className="mb-1 text-lg font-semibold text-text">Something went wrong</h1>
          <p className="mb-5 text-sm text-muted">{this.state.error.message}</p>
          <button
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              this.setState({ error: null })
              location.reload()
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
