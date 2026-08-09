import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin in development, so admin fetches never hit CORS locally and no
    // preflight is added to every call. The API keeps its own explicit CORS
    // allowlist (server/.env CORS_ORIGIN) for the deployed case, where the two
    // are served from different origins - the proxy is a dev convenience, not
    // the production answer.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
