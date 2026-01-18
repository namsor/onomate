import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'ui',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: '../dist/ui',
    emptyOutDir: true
  }
});