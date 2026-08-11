import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Third param '' loads ALL env vars (not just VITE_-prefixed) so server-only
  // secrets like API_PROXY_AUTH can live in .env without being exposed to client code.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
      include: ['react-router-dom'],
      exclude: ['opencascade.js'],
    },
    build: {
      target: 'esnext',
    },
    server: {
      port: 5124,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      proxy: env.API_PROXY_TARGET
        ? {
            '/api': {
              target: env.API_PROXY_TARGET,
              changeOrigin: true,
              secure: true,
              auth: env.API_PROXY_AUTH || undefined,
              cookieDomainRewrite: 'localhost',
            },
          }
        : undefined,
    },
    // Keep `vite preview` cross-origin-isolated like dev and Vercel (vercel.json).
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
