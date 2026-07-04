import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Base path = the repo name (so forks like AC-Intelligence-Smartboard-1 work too).
  // The deploy workflow sets VITE_BASE from the repo name; falls back for local builds.
  base: process.env.VITE_BASE || '/AC-Intelligence-Smartboard/',
  root: resolve(__dirname, 'web'),
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      // Allow the HTML entry to reference renderer source via /src
      '/src': resolve(__dirname, 'src')
    }
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174
  }
})
