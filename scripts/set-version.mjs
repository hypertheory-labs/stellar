#!/usr/bin/env node
/**
 * Set the version of all published packages in one step.
 *
 *   node scripts/set-version.mjs 0.5.0
 *
 * The three packages share one version number. This also keeps
 * stellar-ng-devtools' dependency on sanitize pointing at the same release.
 * The publish workflow refuses to run if any of these disagree with the tag.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? '')) {
  console.error('usage: node scripts/set-version.mjs <x.y.z>');
  process.exit(1);
}

const files = [
  'libs/sanitize/package.json',
  'libs/stellar-ng/package.json',
  'libs/stellar-mcp/package.json',
];

for (const file of files) {
  // String replacement rather than JSON round-trip, so formatting is untouched.
  let text = readFileSync(file, 'utf8');
  text = text.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`);
  text = text.replace(/("@hypertheory-labs\/sanitize":\s*")[^"]+(")/, `$1^${version}$2`);
  writeFileSync(file, text);
  console.log(`${file} → ${version}`);
}

console.log(`\nNext: commit, then  git tag v${version} && git push origin master v${version}`);
