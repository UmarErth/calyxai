import { Capacitor } from '@capacitor/core'

declare global {
  interface Window {
    calyxNative?: {
      platform: string
      openOAuth: (url: string) => Promise<void>
      onAuthCallback: (listener: (url: string) => void) => () => void
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      onUpdateState: (listener: (state: NativeUpdateState) => void) => () => void
    }
  }
}

export interface NativeUpdateState { status: 'checking' | 'available' | 'downloading' | 'installing' | 'current' | 'error'; version?: string; progress?: number }

export const isDesktopApp = () => Boolean(window.calyxNative)
export const isAndroidApp = () => Capacitor.isNativePlatform()
export const isNativeApp = () => isDesktopApp() || isAndroidApp()
export const authRedirectUrl = () => isNativeApp() ? 'calyx://auth/callback' : `${location.origin}/#chat`

export async function openNativeOAuth(url: string) {
  if (isDesktopApp()) return window.calyxNative!.openOAuth(url)
  if (isAndroidApp()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url, presentationStyle: 'popover' })
    return
  }
  location.assign(url)
}

export async function listenForNativeAuth(callback: (url: string) => void) {
  if (isDesktopApp()) return window.calyxNative!.onAuthCallback(callback)
  if (isAndroidApp()) {
    const { App } = await import('@capacitor/app')
    const listener = await App.addListener('appUrlOpen', ({ url }) => callback(url))
    const launch = await App.getLaunchUrl()
    if (launch?.url) callback(launch.url)
    return () => { void listener.remove() }
  }
  return () => undefined
}

export async function closeNativeOAuth() {
  if (!isAndroidApp()) return
  const { Browser } = await import('@capacitor/browser')
  await Browser.close().catch(() => undefined)
}
