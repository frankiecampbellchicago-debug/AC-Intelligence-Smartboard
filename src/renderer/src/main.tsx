import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted brand font (offline / CSP-safe): Schibsted Grotesk — same face as the AC Intelligence site.
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/schibsted-grotesk/800.css'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginGate } from './components/LoginGate'

// Inject the web API shim when running in a browser (no Electron preload)
if (!(window as { api?: unknown }).api) {
  const { createWebApi, migrateWebStore } = await import('./lib/webApiShim')
  migrateWebStore()
  ;(window as { api?: unknown }).api = createWebApi()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LoginGate>
        <App />
      </LoginGate>
    </ErrorBoundary>
  </StrictMode>
)
