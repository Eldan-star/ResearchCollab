import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'], // These should be in your public folder
      manifest: {
        name: 'University Research Collaboration Platform',
        short_name: 'ResearchCollab',
        description: 'A platform for university research collaboration.',
        theme_color: '#007A7A',
        icons: [
          {
            src: 'icons/icon-192x192.png', // Corrected path
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png', // Corrected path
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png', // Corrected path for maskable
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ],
      },
    })
  ],
})