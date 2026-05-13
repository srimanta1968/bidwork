import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served at https://bidwork.projexlight.com/admin/ on prod, so emitted asset
  // URLs need the /admin/ prefix to resolve correctly under nginx.
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
