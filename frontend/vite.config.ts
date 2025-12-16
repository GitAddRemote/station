import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const host = process.env.VITE_HOST ?? '127.0.0.1';
const port = Number(process.env.VITE_PORT) || 5173;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host,
    port,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
