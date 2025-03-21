import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
        target: 'binding-wylma-spidy618-051ecfb8.koyeb.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mindicador/, ''),
        secure: false
      }
    }
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
