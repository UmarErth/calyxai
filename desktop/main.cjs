const { app, BrowserWindow, shell } = require('electron')

const CALYX_ORIGIN = 'https://calyxai.pages.dev'

function openExternal(url) {
  try {
    const destination = new URL(url)
    if (['https:', 'http:', 'mailto:'].includes(destination.protocol)) void shell.openExternal(url)
  } catch {
    // Ignore malformed navigation requests.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#11161d',
    title: 'Calyx',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === CALYX_ORIGIN) return { action: 'allow' }
    } catch {
      return { action: 'deny' }
    }
    openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin === CALYX_ORIGIN) return
    } catch {
      event.preventDefault()
      return
    }
    if (url) {
      event.preventDefault()
      openExternal(url)
    }
  })

  void window.loadURL(`${CALYX_ORIGIN}/#chat`)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
