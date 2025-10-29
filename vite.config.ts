import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/titles': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/elements': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/generate': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/hots': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
