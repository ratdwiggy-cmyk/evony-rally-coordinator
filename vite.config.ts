import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ---------------------------------------------------------------------------
// GitHub Pages hosts this app from a repo-scoped subdirectory, e.g.
//   https://ratdwiggy-cmyk.github.io/evony-rally-coordinator/
// `base` must match the repo name (with leading/trailing slashes) so every
// built asset URL resolves correctly. If this repo is ever renamed, update
// REPO_NAME below — nothing else in the build needs to change.
// ---------------------------------------------------------------------------
const REPO_NAME = 'evony-rally-coordinator';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Evony Rally Coordinator',
        short_name: 'Rally Coordinator',
        description: 'Live alliance status board for Evony.',
        theme_color: '#0B0D12',
        background_color: '#0B0D12',
        display: 'standalone',
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      // App shell caching only — deliberately no Workbox runtime-caching
      // strategy for Firestore requests. Firestore's own IndexedDB-backed
      // offline persistence (see firebase/config.ts, ADR-005) already
      // handles the "show last-known data while offline" requirement; a
      // second cache layer here would just duplicate it.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
