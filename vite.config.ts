import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Change this in .env.local if your Vercel dev server uses a different port
  const BACKEND_ORIGIN = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: BACKEND_ORIGIN,
          changeOrigin: true,
          secure: false,
          // no rewrite: we want to keep /api for the backend
        },
      },
    },
    base: '/loanCalcApp/',
  };
});
