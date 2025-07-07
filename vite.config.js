// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'workers/worker.js',
      formats: ['es'],
      fileName: () => 'worker.js',
    },
    outDir: 'public',
    emptyOutDir: false,
  },
});
