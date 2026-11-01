import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A gestão é servida pelo nginx em /gestao/ (arquivos estáticos, sem servidor Node na VPS).
// No "npm run dev", os pedidos /api vão para o Docker local (docker compose up → http://localhost:8089).
export default defineConfig({
  base: '/gestao/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8089', changeOrigin: true } },
  },
});
