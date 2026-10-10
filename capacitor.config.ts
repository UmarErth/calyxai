import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ai.calyx.app',
  appName: 'Calyx',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
