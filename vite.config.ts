import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      port: 1422,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true' ? { port: 1423 } : false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
