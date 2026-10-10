import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'test' ? [] : [cloudflare()])],
  server: { port: 5173 },
}))
