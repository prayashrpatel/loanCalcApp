import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3002', // <- use the port vercel printed
    },
  },
  base: '/loanCalcApp/',
});
