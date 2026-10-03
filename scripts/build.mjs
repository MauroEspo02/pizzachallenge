#!/usr/bin/env node
/**
 * Compila il codice del browser (isole React + CSS) in public/assets.
 *   node scripts/build.mjs           → build di produzione
 *   node scripts/build.mjs --watch   → ricompila a ogni modifica (usato da npm run dev)
 *   node scripts/build.mjs --server  → crea anche dist/server.mjs per l'hosting su Node
 */
import { build, context } from 'esbuild';
import { rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const withServer = process.argv.includes('--server');
const outdir = resolve(root, 'public/assets');

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const client = {
  absWorkingDir: root,
  entryPoints: { client: 'src/client/main.ts', app: 'src/styles/app.css' },
  outdir,
  bundle: true,
  format: 'esm',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: ['es2020', 'safari15', 'chrome100', 'firefox100'],
  jsx: 'automatic',
  loader: { '.woff2': 'file', '.svg': 'file' },
  external: ['/fonts/*', '/img/*', '/icons/*'],
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  legalComments: 'none',
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(client);
  await ctx.watch();
  console.log('  esbuild: in ascolto delle modifiche…');
} else {
  await build(client);
  if (withServer) {
    await build({
      absWorkingDir: root,
      entryPoints: ['src/server/node.ts'],
      outfile: resolve(root, 'dist/server.mjs'),
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      jsx: 'automatic',
      banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'info',
    });
  }
}
