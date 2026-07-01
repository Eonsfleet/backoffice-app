import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest configuration.
 *
 * Install required devDependencies before running tests:
 *
 *   npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths \
 *     @testing-library/react @testing-library/jest-dom \
 *     @testing-library/user-event jsdom
 *
 * Then add to package.json scripts:
 *   "test":       "vitest run",
 *   "test:watch": "vitest",
 *   "test:ui":    "vitest --ui"
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '_reference', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**', 'hooks/**', 'features/**/api.ts', 'stores/**'],
      exclude: ['lib/env.ts'],
    },
  },
})
