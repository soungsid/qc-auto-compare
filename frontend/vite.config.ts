import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.preview.emergentagent.com',
      '.preview.emergentcf.cloud',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
