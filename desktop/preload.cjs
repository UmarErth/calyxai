const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('calyxNative', {
  platform: process.platform,
  openOAuth: url => ipcRenderer.invoke('open-oauth', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  onUpdateState: listener => {
    const handler = (_event, state) => listener(state)
    ipcRenderer.on('update-state', handler)
    return () => ipcRenderer.removeListener('update-state', handler)
  },
  onAuthCallback: listener => {
    const handler = (_event, url) => listener(url)
    ipcRenderer.on('auth-callback', handler)
    return () => ipcRenderer.removeListener('auth-callback', handler)
  },
})
