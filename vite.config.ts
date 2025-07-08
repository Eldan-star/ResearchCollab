import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'], // Adjust as needed
      manifest: {
        name: 'University Research Collaboration Platform',
        short_name: 'ResearchCollab',
        description: 'A platform for university research collaboration.',
        theme_color: '#007A7A',
        icons: [
          {
            src: 'pwa-192x192.png', // Path relative to output dir
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Path relative to output dir
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Path relative to output dir
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable', // Add maskable icon
          }
        ],
      },
    })
  ],
})