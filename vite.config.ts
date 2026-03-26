import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function isReactRuntimeModule(id: string): boolean {
  return (
    id.includes('/react/') ||
    id.includes('\\react\\') ||
    id.includes('/react-dom/') ||
    id.includes('\\react-dom\\') ||
    id.includes('/scheduler/') ||
    id.includes('\\scheduler\\') ||
    id.includes('/use-sync-external-store/') ||
    id.includes('\\use-sync-external-store\\')
  );
}

function isMotionRuntimeModule(id: string): boolean {
  return (
    id.includes('framer-motion') ||
    id.includes('/motion-dom/') ||
    id.includes('\\motion-dom\\') ||
    id.includes('/motion-utils/') ||
    id.includes('\\motion-utils\\') ||
    id.includes('/motion/') ||
    id.includes('\\motion\\')
  );
}

function isTanStackQueryModule(id: string): boolean {
  return (
    id.includes('@tanstack/react-query') ||
    id.includes('/@tanstack/query-core/') ||
    id.includes('\\@tanstack\\query-core\\')
  );
}

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost',
    hmr: {
      host: 'localhost',
      clientPort: 3000,
      protocol: 'ws',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (isReactRuntimeModule(id)) {
            return 'vendor-react';
          }

          if (isMotionRuntimeModule(id)) {
            return 'vendor-motion';
          }

          if (isTanStackQueryModule(id)) {
            return 'vendor-query';
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          return 'vendor-misc';
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
      manifest: false, // Use existing public/manifest.json
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
