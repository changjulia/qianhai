import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      'cloudflare:workers': fileURLToPath(
        new URL('./server/cloudflare-workers-shim.ts', import.meta.url),
      ),
    },
  },
  build: {
    ssr: fileURLToPath(new URL('./server/index.ts', import.meta.url)),
    target: 'node22',
    outDir: 'dist-backend',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'server.mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    },
  },
});

