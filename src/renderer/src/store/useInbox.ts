import { create } from 'zustand'
import {
  MockEmailProvider,
  seedMessages,
  type Draft,
  type EmailMessage,
  type Folder
} from '../lib/email'

// Swap this for a real provider (Gmail/Graph) later — the store API stays the same.
const provider = new MockEmailProvider(seedMessages())

interface InboxState {
  account: string
  messages: EmailMessage[]
  folder: Folder
  selectedId: string | null
  composeOpen: boolean

  setFolder: (f: Folder) => void
  select: (id: string | null) => void
  markRead: (id: string, read: boolean) => void
  toggleStar: (id: string) => void
  archive: (id: string) => void
  trash: (id: string) => void
  restore: (id: string) => void
  openCompose: () => void
  closeCompose: () => void
  send: (draft: Draft) => void
}

export const useInbox = create<InboxState>((set) => ({
  account: provider.account(),
  messages: provider.list(),
  folder: 'inbox',
  selectedId: null,
  composeOpen: false,

  setFolder: (folder) => set({ folder, selectedId: null }),

  // Selecting a message marks it read.
  select: (id) =>
    set((s) => ({
      selectedId: id,
      messages: id ? s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) : s.messages
    })),

  markRead: (id, read) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, read } : m)) })),

  toggleStar: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)) })),

  archive: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, folder: 'archive' as Folder } : m)),
      selectedId: s.selectedId === id ? null : s.selectedId
    })),

  trash: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, folder: 'trash' as Folder } : m)),
      selectedId: s.selectedId === id ? null : s.selectedId
    })),

  restore: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, folder: 'inbox' as Folder } : m)) })),

  openCompose: () => set({ composeOpen: true }),
  closeCompose: () => set({ composeOpen: false }),

  send: (draft) => {
    const sent = provider.send(draft)
    set((s) => ({ messages: [sent, ...s.messages], composeOpen: false, folder: 'sent', selectedId: sent.id }))
  }
}))
