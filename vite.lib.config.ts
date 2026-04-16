import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/** Library bundle + types via `pnpm build`. */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DndList',
      fileName: 'dnd-list',
      formats: ['es'],
    },
    emptyOutDir: true,
    copyPublicDir: false,
    outDir: 'dist',
  },
})
