import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Map the in-monorepo path aliases to source files. Vitest doesn't read
 * tsconfig path mappings on its own — without this, the test runner fails to
 * resolve `@hypertheory-labs/stellar-ng-devtools` (which has no published
 * artifact in node_modules; the path lives only in tsconfig.json/paths).
 */
const stellarNgSrc = resolve(__dirname, '../stellar-ng/src/public-api.ts');
const sanitizeSrc = resolve(__dirname, '../sanitize/src/public-api.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@hypertheory-labs/stellar-ng-devtools': stellarNgSrc,
      '@hypertheory-labs/sanitize': sanitizeSrc,
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.spec.ts'],
    exclude: ['src/**/__tests__/integration/**'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/__tests__/**', 'src/lib/**/*.spec.ts'],
    },
  },
});
