import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'public-api': 'src/public-api.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  target: 'node20',
  tsconfig: 'tsconfig.lib.json',
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
  // All runtime deps are external. Only our own source gets bundled.
  // @hypertheory-labs/stellar-ng-devtools is a peer dep — present in the
  // consumer's environment, not in this package. Type imports from it are
  // erased at compile time; the generated .d.ts keeps the named import so
  // consumers get types when they install the peer.
  external: [
    '@hypertheory-labs/stellar-ng-devtools',
    '@modelcontextprotocol/sdk',
    'ws',
    'zod',
  ],
  // Preserve the shebang on cli.ts so `node dist/cli.js` (and npx) work.
  banner: {
    js: '',
  },
});
