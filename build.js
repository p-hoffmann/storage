// Modified by Trex contributors. Original Copyright (c) 2026 Supabase, Inc.
// See LICENSE for the original Apache-2.0 license.
// biome-ignore lint/style/noCommonJs: build script runs as CommonJS
const { build } = require('esbuild')

build({
  entryPoints: ['./src/**/*.ts'],
  bundle: false,
  outdir: 'dist',
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  tsconfig: 'tsconfig.json',
  loader: { '.ts': 'ts' },
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
