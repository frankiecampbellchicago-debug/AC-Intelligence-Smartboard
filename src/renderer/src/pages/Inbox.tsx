import { useMemo, useState } from 'react'
import { useInbox } from '../store/useInbox'
import { Button } from '../components/ui'
import { relativeTime, cn } from '../lib/util'
import type { EmailMessage, Folder } from '../lib/email'
import {
  IconMail,
  IconReply,
  IconArchive,
  IconTrash,
  IconStar,
  IconSend,
  IconPlus,
  IconChevronLeft
} from '../components/icons'

const FOLDERS: { id: Folder; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'archive', label: 'Archive' },
  { id: 'trash', label: 'Trash' }
]

const CARD = 'rounded-2xl border border-border bg-surface shadow-[var(--shadow)]'

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Inbox(): React.JSX.Element {
  const account = useInbox((s) => s.account)
  const messages = useInbox((s) => s.messages)
  const folder = useInbox((s) => s.folder)
  const selectedId = useInbox((s) => s.selectedId)
  const composeOpen = useInbox((s) => s.composeOpen)
  const setFolder = useInbox((s) => s.setFolder)
  const select = useInbox((s) => s.select)
  const markRead = useInbox((s) => s.markRead)
  const toggleStar = useInbox((s) => s.toggleStar)
  const archive = useInbox((s) => s.archive)
  const trash = useInbox((s) => s.trash)
  const openCompose = useInbox((s) => s.openCompose)
  const closeCompose = useInbox((s) => s.closeCompose)
  const send = useInbox((s) => s.send)

  const [draft, setDraft] = useState({ to: '', subject: '', body: '' })

  const unread = useMemo(
    () => messages.filter((m) => m.folder === 'inbox' && !m.read).length,
    [messages]
  )
  const list = useMemo(
    () => messages.filter((m) => m.folder === folder).sort((a, b) => b.date - a.date),
    [messages, folder]
  )
  const selected = messages.find((m) => m.id === selectedId) ?? null

  function startCompose(prefill?: Partial<typeof draft>): void {
    setDraft({ to: '', subject: '', body: '', ...prefill })
    openCompose()
  }
  function reply(m: EmailMessage): void {
    startCompose({
      to: m.from.email,
      subject: m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`,
      body: `\n\n---\nOn ${new Date(m.date).toLocaleString()}, ${m.from.name} wrote:\n${m.body}`
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {FOLDERS.map((f) => {
            const count =
              f.id === 'inbox' ? unread : messages.filter((m) => m.folder === f.id).length
            return (
              <button
                key={f.id}
                onClick={() => setFolder(f.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  folder === f.id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text'
                )}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] font-bold',
                      folder === f.id ? 'bg-accent text-[var(--ink-fg)]' : 'bg-bg text-subtle'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-subtle sm:inline">{account}</span>
          <Button onClick={() => startCompose()}>
            <IconPlus className="h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {/* Two-pane: list + reading */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Message list */}
        <div className={cn(CARD, 'flex min-h-0 flex-col overflow-hidden')}>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {list.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
                Nothing in {folder}.
              </div>
            ) : (
              list.map((m) => {
                const isSel = selected?.id === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => select(m.id)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left transition',
                      isSel ? 'bg-accent-soft' : 'hover:bg-bg'
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-muted">
                      {initials(m.from.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm',
                            m.read ? 'font-medium text-text' : 'font-bold text-text'
                          )}
                        >
                          {m.from.name}
                        </span>
                        {!m.read && folder === 'inbox' && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                        <span className="shrink-0 text-[11px] text-subtle">
                          {relativeTime(m.date)}
                        </span>
                      </div>
                      <div className={cn('truncate text-[13px]', m.read ? 'text-muted' : 'font-semibold text-text')}>
                        {m.subject}
                      </div>
                      <div className="truncate text-[12px] text-subtle">{m.preview}</div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Reading pane */}
        <div className={cn(CARD, 'flex min-h-0 flex-col overflow-hidden')}>
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-text">{selected.subject}</h2>
                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-text">{selected.from.name}</span>
                    <span className="text-subtle">&lt;{selected.from.email}&gt;</span>
                  </div>
                  <div className="text-xs text-subtle">
                    to {selected.to} · {new Date(selected.date).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconAction onClick={() => toggleStar(selected.id)} title="Star" active={selected.starred}>
                    <IconStar className="h-4 w-4" />
                  </IconAction>
                  <IconAction onClick={() => markRead(selected.id, false)} title="Mark unread">
                    <IconMail className="h-4 w-4" />
                  </IconAction>
                  <IconAction onClick={() => archive(selected.id)} title="Archive">
                    <IconArchive className="h-4 w-4" />
                  </IconAction>
                  <IconAction onClick={() => trash(selected.id)} title="Delete" danger>
                    <IconTrash className="h-4 w-4" />
                  </IconAction>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{selected.body}</p>
              </div>
              <div className="border-t border-border p-4">
                <Button variant="subtle" onClick={() => reply(selected)}>
                  <IconReply className="h-4 w-4" /> Reply
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
              <IconMail className="mb-2 h-8 w-8 text-subtle" />
              Select a message to read.
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={closeCompose}>
          <div
            className={cn(CARD, 'w-full max-w-lg')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-display text-base font-semibold text-text">New message</h2>
              <button onClick={closeCompose} className="text-muted hover:text-text">
                <IconChevronLeft className="h-4 w-4 rotate-90" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <input
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                placeholder="To"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="Subject"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Write your message…"
                className="min-h-40 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="ghost" onClick={closeCompose}>
                Discard
              </Button>
              <Button onClick={() => send(draft)} disabled={!draft.to.trim()}>
                <IconSend className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IconAction({
  onClick,
  title,
  active,
  danger,
  children
}: {
  onClick: () => void
  title: string
  active?: boolean
  danger?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface transition',
        active ? 'text-amber' : danger ? 'text-muted hover:text-red' : 'text-muted hover:border-accent hover:text-accent'
      )}
    >
      {children}
    </button>
  )
}
