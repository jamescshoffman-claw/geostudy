import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  root: 'src',
  publicDir: 'public',
  server: {
    // In dev the API lives in a separate process (`npm run dev:worker`,
    // wrangler's local runtime on :8787). Forwarding /api there lets the app
    // use the same relative URLs in dev and production.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
