import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Helper function to get allowed hosts from environment or use defaults
const getAllowedHosts = () => {
  const defaultHosts = [
    // Local development
    'localhost',
    '127.0.0.1',
    // Docker Desktop default hostname pattern
    '.docker.internal',
    // OrbStack domains
    '.orb.local',
    // Allow all subdomains of these base domains
    'boxento-dev.boxento.orb.local',
    'boxento-prod.boxento.orb.local',
    'boxento.boxento.orb.local',
    // Allow custom domains set via environment variable
    ...(process.env.VITE_ALLOWED_HOSTS || '').split(',').filter(Boolean)
  ]
  
  return defaultHosts
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/mindicador': {
        target: 'https://mindicador.cl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mindicador/, ''),
        secure: false
      }
    },
    host: true, // Listen on all network interfaces
    port: 5173,
    strictPort: true,
    cors: true,
    // Hosts allowed for dev server
    allowedHosts: getAllowedHosts()
  },
  preview: {
    port: 5173,
    host: true, // Listen on all network interfaces
    // Use same allowed hosts for preview
    allowedHosts: getAllowedHosts()
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Put ALL node_modules in a single vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          
          // App.tsx in its own chunk due to size
          if (id.includes('/App.tsx')) {
            return 'app';
          }
          
          // Components in their own chunk
          if (id.includes('/components/')) {
            return 'ui-components';
          }
          
          // Library files (including contexts) in their own chunk
          if (id.includes('/lib/') || id.includes('/utils/')) {
            return 'lib';
          }
        }
      },
    },
    chunkSizeWarningLimit: 800, // Increased since vendor will be larger
  },
})
