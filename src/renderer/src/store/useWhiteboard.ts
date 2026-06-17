import { create } from 'zustand'

export interface WBItem {
  id: string
  type: 'idea' | 'image'
  prompt: string
  dataUrl?: string
  createdAt: number
}

interface WBState {
  items: WBItem[]
  hydrated: boolean
  hasKey: boolean
  generating: boolean
  hydrate: () => Promise<void>
  checkKey: () => Promise<void>
  addIdea: (prompt: string) => void
  generate: (prompt: string) => Promise<string | null>
  remove: (id: string) => void
}

function persist(items: WBItem[]): void {
  void window.api.whiteboard.set({ items })
}

export const useWhiteboard = create<WBState>((set, get) => ({
  items: [],
  hydrated: false,
  hasKey: false,
  generating: false,

  hydrate: async () => {
    try {
      const data = (await window.api.whiteboard.get()) as { items?: WBItem[] }
      set({ items: Array.isArray(data?.items) ? data.items : [], hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },

  checkKey: async () => {
    try {
      set({ hasKey: await window.api.settings.hasApiKey() })
    } catch {
      set({ hasKey: false })
    }
  },

  addIdea: (prompt) => {
    const text = prompt.trim()
    if (!text) return
    const item: WBItem = { id: crypto.randomUUID(), type: 'idea', prompt: text, createdAt: Date.now() }
    const items = [item, ...get().items]
    set({ items })
    persist(items)
  },

  generate: async (prompt) => {
    const text = prompt.trim()
    if (!text) return 'Empty prompt.'
    set({ generating: true })
    try {
      const res = await window.api.image.generate(text)
      if (res.error || !res.dataUrl) return res.error ?? 'Generation failed.'
      const item: WBItem = {
        id: crypto.randomUUID(),
        type: 'image',
        prompt: text,
        dataUrl: res.dataUrl,
        createdAt: Date.now()
      }
      const items = [item, ...get().items]
      set({ items })
      persist(items)
      return null
    } finally {
      set({ generating: false })
    }
  },

  remove: (id) => {
    const items = get().items.filter((i) => i.id !== id)
    set({ items })
    persist(items)
  }
}))
