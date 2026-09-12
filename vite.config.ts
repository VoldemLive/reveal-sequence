import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? '/reveal-sequence/' : '/',
  build:
    mode === 'library'
      ? {
          emptyOutDir: true,
          minify: 'terser',
          terserOptions: {
            compress: { passes: 3, pure_getters: true },
            mangle: true,
          },
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
