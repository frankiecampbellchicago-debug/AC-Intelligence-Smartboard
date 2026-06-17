# Website Cookbook

A desktop hub for building websites — a guided **7-level build wizard** + a **project tracker** for all your sites. Electron + React 19 + Tailwind 4 + Vite 7 + Zustand.

## The 7 levels
1. The Raw Prompter · 2. The Skill Stacker · 3. The Visual Director · 4. The Cloner · 5. The Component Sniper · 6. The Designer · 7. SEO Optimize

## Run it

```bash
npm install          # first time only
npm run dev          # live-reload dev app (make changes here)
```

## Package a desktop app

```bash
npm run pack         # builds an unsigned .app into dist/mac-arm64/
```

Then copy `dist/mac-arm64/Website Cookbook.app` wherever you like (Desktop, /Applications).
A ready-to-use copy is already on your Desktop.

## Project layout

```
src/
  main/        Electron main process — window, security, IPC, atomic JSON store
  preload/     contextBridge — the only API the UI can touch (window.api)
  shared/      types.ts (Zod schemas) + levels.ts (the 7-level content)
  renderer/    React UI
    src/
      pages/        Dashboard, Wizard, Projects, Resources, Settings
      components/   Sidebar, ui primitives, icons, ErrorBoundary
      store/        Zustand store (debounced persistence)
      lib/          theme, helpers
```

## Data & safety
- Projects are stored locally at `~/Library/Application Support/website-cookbook/projects.json`.
- Writes are **atomic** (temp file → rename) with a `.bak` backup.
- Reads are **Zod-validated**; a corrupt file falls back to the backup, then to empty — never a white screen.
- Renderer runs sandboxed with `contextIsolation`, no Node access, and a strict CSP.

## Roadmap (not yet built)
- Auto-scan a folder to populate the tracker
- Analytics charts (Recharts) on the dashboard
- Per-project "current level" auto-advance as skills are checked
