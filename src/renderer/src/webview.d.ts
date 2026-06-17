import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// Type the Electron <webview> custom element for TSX.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        partition?: string
        allowpopups?: string
        useragent?: string
      }
    }
  }
}
