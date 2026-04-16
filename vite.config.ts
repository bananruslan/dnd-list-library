import { defineConfig } from 'vite'

/** Dev server + SPA build for the demo (`pnpm dev`, `pnpm build:demo`). */
export default defineConfig({
  build: {
    outDir: 'dist-demo',
  },
})
