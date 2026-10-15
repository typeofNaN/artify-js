import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  base: './',
  plugins: [dts({ include: ['src'] })],
  build: {
    lib: {
      entry: {
        'artify-js': 'src/index.ts',
        worker: 'src/worker.ts',
        'artify.worker': 'src/worker/artify.worker.ts',
      },
      formats: ['es'],
    },
    sourcemap: true,
    rollupOptions: { output: { entryFileNames: '[name].js' } },
  },
})
