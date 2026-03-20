import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/transactions': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/plaid': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/advisor': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
