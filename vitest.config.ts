/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      lines: 60,
      functions: 60,
      branches: 50,
      statements: 60,
      thresholds: {
        'src/utils/': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
})