import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['socket.io-client'],
    exclude: ['react-router-dom']
  },
  resolve: {
    alias: {
      'socket.io-client': 'socket.io-client'
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  }
});