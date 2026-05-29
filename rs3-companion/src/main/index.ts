import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1408',
    title: 'RS3 Companion',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void import('electron').then(({ shell }) => shell.openExternal(details.url))
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    overlayWindow?.close()
    overlayWindow = null
  })
}

function createOverlayWindow(): void {
  if (overlayWindow) {
    overlayWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize

  overlayWindow = new BrowserWindow({
    width: 360,
    height: 220,
    x: width - 380,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  overlayWindow.on('ready-to-show', () => {
    overlayWindow?.show()
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void overlayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?overlay=1`)
  } else {
    void overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { overlay: '1' }
    })
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
    mainWindow?.webContents.send('overlay:closed')
  })
}

function setupIpc(): void {
  ipcMain.handle('overlay:open', () => {
    createOverlayWindow()
    return true
  })

  ipcMain.handle('overlay:close', () => {
    overlayWindow?.close()
    overlayWindow = null
    return true
  })

  ipcMain.handle('overlay:is-open', () => overlayWindow !== null)

  ipcMain.on('overlay:update', (_event, payload: unknown) => {
    overlayWindow?.webContents.send('overlay:state', payload)
  })
}

app.whenReady().then(() => {
  setupIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
