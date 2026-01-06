import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Copy static HTML files and service worker to dist folder after build
        {
          name: 'copy-static-files',
          closeBundle() {
            try {
              copyFileSync('404.html', 'dist/404.html');
              copyFileSync('public/about-share.html', 'dist/about-share.html');
              copyFileSync('public/about-share-wa.html', 'dist/about-share-wa.html');
              copyFileSync('public/service-worker.js', 'dist/service-worker.js');
              copyFileSync('public/browserconfig.xml', 'dist/browserconfig.xml');
            } catch (err) {
              console.warn('Could not copy static files:', err);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom']
      },
      optimizeDeps: {
        include: ['react', 'react-dom']
      }
    };
});
