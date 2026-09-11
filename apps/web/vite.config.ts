import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    // Point workspace package imports at their TypeScript sources directly.
    // Vite compiles them on the fly — no separate tsc build step needed.
    alias: {
      '@arcanium/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@arcanium/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
});
