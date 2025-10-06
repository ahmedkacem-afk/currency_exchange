import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Ensure 404.html is copied to the build output
const copyFiles = () => ({
  name: 'copy-files',
  generateBundle() {
    // Make sure the 404.html file is copied to dist during build
    if (fs.existsSync('./public/404.html')) {
      const content = fs.readFileSync('./public/404.html', 'utf-8')
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: content
      })
    }
  }
})

export default defineConfig({
  plugins: [react(), copyFiles()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    },
    // Enable proper history API fallback for SPA routing
    open: true,
    cors: true,
    historyApiFallback: {
      disableDotRule: true,
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
    }
  },
  preview: {
    port: 5173,
    // Also apply history API fallback to the preview server
    historyApiFallback: true
  },
  // Properly handle SPA routing
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    // Generate SPA-compatible files
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
})


