import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api/send-push-user': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api/vorna': {
          target: 'https://api.trade.vornabroker.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/vorna/, ''),
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Origin', 'https://trade.vornabroker.com');
              proxyReq.setHeader('Referer', 'https://trade.vornabroker.com/');
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
