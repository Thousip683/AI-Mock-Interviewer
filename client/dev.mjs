import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

const server = await createServer({
  configFile: false,
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
  optimizeDeps: {
    noDiscovery: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

await server.listen();
server.printUrls();
