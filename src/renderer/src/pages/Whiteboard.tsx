import { useEffect, useState } from 'react'
import { useWhiteboard, type WBItem } from '../store/useWhiteboard'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui'
import { relativeTime, cn } from '../lib/util'
import { IconPlus, IconWizard, IconTrash, IconRefresh, IconAlert } from '../components/icons'

export function Whiteboard(): React.JSX.Element {
  const items = useWhiteboard((s) => s.items)
  const hasKey = useWhiteboard((s) => s.hasKey)
  const generating = useWhiteboard((s) => s.generating)
  const hydrate = useWhiteboard((s) => s.hydrate)
  const checkKey = useWhiteboard((s) => s.checkKey)
  const addIdea = useWhiteboard((s) => s.addIdea)
  const generate = useWhiteboard((s) => s.generate)
  const remove = useWhiteboard((s) => s.remove)
  const setView = useStore((s) => s.setView)

  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void hydrate()
    void checkKey()
  }, [hydrate, checkKey])

  async function onGenerate(): Promise<void> {
    setErr(null)
    const e = await generate(text)
    if (e) setErr(e)
    else setText('')
  }
  function onIdea(): void {
    addIdea(text)
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-text">Whiteboard</h1>
        <p className="mt-0.5 text-sm text-muted">
          A space to brainstorm — drop ideas and dream up visuals. Everything you make is saved.
        </p>
      </div>

      {/* Key banner */}
      {!hasKey && (
        <div className="mb-4 flex shrink-0 items-center gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-2.5 text-sm text-text">
          <IconAlert className="h-4 w-4 shrink-0 text-amber" />
          <span className="flex-1">
            Add an OpenRouter API key in Settings to generate images. (You can still save text
            ideas.)
          </span>
          <button
            onClick={() => setView('settings')}
            className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-[var(--ink-fg)]"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="mb-4 shrink-0 rounded-2xl border border-border bg-surface p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe an idea, a prompt, a landing page… e.g. 'a neon brutalist hero for a coffee brand'"
          className="min-h-16 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-subtle">{err ? <span className="text-red">{err}</span> : 'Save it as a note, or generate an image.'}</span>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={onIdea} disabled={!text.trim()}>
              <IconPlus className="h-4 w-4" /> Save idea
            </Button>
            <Button onClick={() => void onGenerate()} disabled={!text.trim() || generating || !hasKey}>
              {generating ? (
                <IconRefresh className="h-4 w-4 animate-spin" />
              ) : (
                <IconWizard className="h-4 w-4" />
              )}
              {generating ? 'Generating…' : 'Generate image'}
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="whiteboard-bg min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
            <IconWizard className="mb-2 h-8 w-8 text-subtle" />
            Your whiteboard is empty — write an idea or generate something above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((it) => (
              <Card key={it.id} item={it} onRemove={() => remove(it.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ item, onRemove }: { item: WBItem; onRemove: () => void }): React.JSX.Element {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-lg">
      {item.type === 'image' && item.dataUrl && (
        <img src={item.dataUrl} alt={item.prompt} className="aspect-square w-full object-cover" />
      )}
      <div className={cn('flex flex-1 flex-col p-3', item.type === 'idea' && 'min-h-28')}>
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              item.type === 'image' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'
            )}
          >
            {item.type === 'image' ? 'Image' : 'Idea'}
          </span>
          <span className="ml-auto text-[10px] text-subtle">{relativeTime(item.createdAt)}</span>
        </div>
        <p
          className={cn(
            'flex-1 whitespace-pre-wrap text-text',
            item.type === 'idea' ? 'text-sm' : 'line-clamp-2 text-xs text-muted'
          )}
        >
          {item.prompt}
        </p>
      </div>
      <button
        onClick={onRemove}
        title="Delete"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-surface/80 text-muted opacity-0 backdrop-blur transition hover:text-red group-hover:opacity-100"
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  )
}
