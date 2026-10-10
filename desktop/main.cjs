const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')

const APP_SCHEME = 'calyx'
let mainWindow
let pendingAuthUrl

app.setAsDefaultProtocolClient(APP_SCHEME)
if (!app.requestSingleInstanceLock()) app.quit()

function authUrlFromArgs(args) {
  return args.find(value => typeof value === 'string' && value.startsWith(`${APP_SCHEME}://`))
}

function deliverAuthUrl(url) {
  if (!url) return
  pendingAuthUrl = url
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth-callback', url)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
}

function openExternal(url) {
  try {
    const destination = new URL(url)
    if (['https:', 'http:', 'mailto:'].includes(destination.protocol)) void shell.openExternal(url)
  } catch {
    // Ignore malformed navigation requests.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#11161d',
    title: 'Calyx',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file:')) return
    event.preventDefault()
    openExternal(url)
  })
  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingAuthUrl) deliverAuthUrl(pendingAuthUrl)
  })
  void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: 'chat' })
}

ipcMain.handle('open-oauth', async (_event, value) => {
  const url = new URL(value)
  if (url.protocol !== 'https:' || (!url.hostname.endsWith('.supabase.co') && url.hostname !== 'supabase.co')) throw new Error('Blocked OAuth URL')
  await shell.openExternal(url.toString())
})

app.on('second-instance', (_event, argv) => deliverAuthUrl(authUrlFromArgs(argv)))
app.on('open-url', (event, url) => { event.preventDefault(); deliverAuthUrl(url) })
app.whenReady().then(() => {
  pendingAuthUrl = authUrlFromArgs(process.argv)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
