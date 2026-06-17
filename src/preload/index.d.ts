import type { CookbookApi } from './index'

declare global {
  interface Window {
    api: CookbookApi
  }
}

export {}
