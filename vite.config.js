import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 7485,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
