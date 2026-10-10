const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('calyxNative', {
  platform: process.platform,
  openOAuth: url => ipcRenderer.invoke('open-oauth', url),
  onAuthCallback: listener => {
    const handler = (_event, url) => listener(url)
    ipcRenderer.on('auth-callback', handler)
    return () => ipcRenderer.removeListener('auth-callback', handler)
  },
})
