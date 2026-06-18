import { app, shell, BrowserWindow, ipcMain, nativeTheme, session } from 'electron'
import { join } from 'path'
import { readStore, writeStore, readSettings, writeSettings, type ThemePref } from './store'
import { StoreSchema } from '../shared/types'
import { githubStatus, listRepos, getLoginForToken } from './github'
import { fetchLeads, extractSheetId } from './leads'
import {
  generateImage,
  saveImage,
  readWhiteboard,
  writeWhiteboard,
  hasApiKey,
  setApiKey
} from './whiteboard'
import {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  killTerminal,
  killAllTerminals,
  prepareRepo
} from './terminal'
import type { TerminalCreateOpts } from '../shared/types'

const isDev = !app.isPackaged

/** Resolve the window background up front so there's no white flash on launch. */
function resolveBackground(): string {
  const { theme } = readSettings()
  const dark =
    theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors)
  return dark ? '#0f1620' : '#eef1f5'
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 640,
    show: false,
    backgroundColor: resolveBackground(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Enables <webview> for embedded live site previews (each runs isolated).
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Open target=_blank / window.open links in the system browser, never in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Lock down the renderer with a Content-Security-Policy header. */
function installCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws:"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'sha256-/gOfz+bM+QsL8T353DLpZEHTrsAAQ72R7uH5TEazB0Y='; connect-src 'self'"
    callback({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] }
    })
  })
}

function registerIpc(): void {
  // --- Window controls ---
  ipcMain.on('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', () => BrowserWindow.getFocusedWindow()?.close())

  // --- Projects store ---
  ipcMain.handle('store:get', () => readStore())
  ipcMain.handle('store:set', (_e, raw: unknown) => writeStore(StoreSchema.parse(raw)))

  // --- Settings / theme ---
  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:setTheme', (_e, theme: ThemePref) => {
    const next = writeSettings({ ...readSettings(), theme })
    nativeTheme.themeSource = theme
    return next
  })
  ipcMain.handle('theme:shouldUseDark', () => nativeTheme.shouldUseDarkColors)

  // --- Shell actions (URLs vs local paths handled correctly) ---
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    // http(s) for links/websites; tel: dials (macOS hands off to iPhone/FaceTime); mailto: for email.
    if (/^(https?|tel|mailto):/i.test(url)) return shell.openExternal(url)
    return Promise.resolve()
  })
  ipcMain.handle('shell:openPath', (_e, path: string) => shell.openPath(path))
  ipcMain.handle('shell:showItemInFolder', (_e, path: string) => {
    shell.showItemInFolder(path)
  })

  // --- GitHub (via gh CLI; additional accounts via PAT) ---
  ipcMain.handle('github:status', async () => {
    const status = await githubStatus()
    const { additionalGithubAccounts } = readSettings()
    return { ...status, additionalAccounts: additionalGithubAccounts.map((a) => ({ login: a.login })) }
  })
  ipcMain.handle('github:listRepos', () => {
    const { additionalGithubAccounts } = readSettings()
    return listRepos(additionalGithubAccounts.map((a) => a.token))
  })
  ipcMain.handle('github:addAccount', async (_e, token: unknown) => {
    if (typeof token !== 'string' || !token.trim()) return { error: 'Invalid token' }
    try {
      const login = await getLoginForToken(token.trim())
      const settings = readSettings()
      if (settings.additionalGithubAccounts.some((a) => a.login === login))
        return { error: `@${login} is already connected` }
      writeSettings({
        ...settings,
        additionalGithubAccounts: [
          ...settings.additionalGithubAccounts,
          { login, token: token.trim() }
        ]
      })
      return { login }
    } catch {
      return { error: 'Token is invalid or GitHub is unreachable' }
    }
  })
  ipcMain.handle('github:removeAccount', (_e, login: unknown) => {
    if (typeof login !== 'string') return
    const settings = readSettings()
    writeSettings({
      ...settings,
      additionalGithubAccounts: settings.additionalGithubAccounts.filter((a) => a.login !== login)
    })
  })

  // --- Embedded terminal (node-pty) + repo prep ---
  ipcMain.handle('term:create', (e, opts: TerminalCreateOpts) =>
    createTerminal(e.sender, opts ?? {})
  )
  ipcMain.on('term:input', (_e, p: { id: string; data: string }) => writeTerminal(p.id, p.data))
  ipcMain.on('term:resize', (_e, p: { id: string; cols: number; rows: number }) =>
    resizeTerminal(p.id, p.cols, p.rows)
  )
  ipcMain.on('term:kill', (_e, p: { id: string }) => killTerminal(p.id))
  ipcMain.handle('studio:prepareRepo', (_e, repoFullName: string) => prepareRepo(repoFullName))

  // --- Whiteboard: image generation + persistence + local API key ---
  ipcMain.handle('image:generate', (_e, prompt: string) => generateImage(prompt))
  ipcMain.handle('image:save', (_e, p: { dataUrl: string; name: string }) =>
    saveImage(p.dataUrl, p.name)
  )
  ipcMain.handle('wb:get', () => readWhiteboard())
  ipcMain.handle('wb:set', (_e, data: unknown) => writeWhiteboard(data))
  ipcMain.handle('settings:hasApiKey', () => hasApiKey())
  ipcMain.handle('settings:setApiKey', (_e, key: string) => {
    setApiKey(key)
    return hasApiKey()
  })

  // --- Leads: live read of the combined Google Sheet (CSV export) ---
  ipcMain.handle('leads:fetch', () => fetchLeads(readSettings().leadsSheetId))
  ipcMain.handle('leads:getSheetId', () => readSettings().leadsSheetId)
  ipcMain.handle('leads:setSheetId', (_e, idOrUrl: string) => {
    const leadsSheetId = extractSheetId(idOrUrl)
    return writeSettings({ ...readSettings(), leadsSheetId }).leadsSheetId
  })
}

/** Lock down any <webview> the renderer attaches (used for live site previews). */
function hardenWebviews(): void {
  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url)
        return { action: 'deny' }
      })
    }
  })
  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-attach-webview', (_evt, webPreferences) => {
      delete webPreferences.preload
      webPreferences.nodeIntegration = false
      webPreferences.contextIsolation = true
    })
  })
}

app.whenReady().then(() => {
  const { theme } = readSettings()
  nativeTheme.themeSource = theme
  installCsp()
  hardenWebviews()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => killAllTerminals())

app.on('window-all-closed', () => {
  killAllTerminals()
  if (process.platform !== 'darwin') app.quit()
})
