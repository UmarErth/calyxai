import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ai.calyx.app',
  appName: 'Calyx',
  webDir: 'dist',
  server: {
    url: 'https://calyxai.pages.dev/#chat',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
