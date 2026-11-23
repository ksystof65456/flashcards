import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  plugins: [react(), tailwind(), VitePWA({ registerType: 'autoUpdate',
    manifest: { name: 'Flashcards', short_name: 'Flashcards', display: 'standalone', orientation: 'portrait',
      theme_color: '#0a0d0d', background_color: '#0a0d0d', start_url: '/',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] } })],
  test: { environment: 'jsdom' }
})
