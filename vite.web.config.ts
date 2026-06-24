import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/AC-Intelligence-Smartboard/',
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
