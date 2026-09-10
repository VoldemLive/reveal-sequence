import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build:
    mode === 'library'
      ? {
          emptyOutDir: true,
          minify: 'oxc',
          lib: {
            entry: 'src/lib/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
          },
          rollupOptions: {
            output: {
              minify: {
                codegen: true,
                compress: true,
                mangle: true,
              },
            },
            external: [/^react(\/.*)?$/, /^react-dom(\/.*)?$/],
          },
          sourcemap: true,
        }
      : undefined,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}))
