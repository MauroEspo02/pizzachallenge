#!/usr/bin/env node
/**
 * Sviluppo locale con un solo comando: `npm run dev`
 * - ricompila JS e CSS del browser a ogni modifica;
 * - avvia il server su http://localhost:3000 con un database SQLite locale (.data/);
 * - partecipanti con PIN dimostrativi (Guido 1111, Leticia 2222, Mauro 3333, Terry 4444, Lorenzo 5555, Gigio 6666);
 * - area admin su /admin con password "pizza" (se non imposti ADMIN_PASSWORD).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, APP_ENV: process.env.APP_ENV ?? 'development', NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --disable-warning=ExperimentalWarning`.trim() };

const children = [
  spawn(process.execPath, ['scripts/build.mjs', '--watch'], { cwd: root, env, stdio: 'inherit' }),
  spawn(process.execPath, [fileURLToPath(import.meta.resolve('tsx/cli')), 'watch', '--clear-screen=false', 'src/server/node.ts'], { cwd: root, env, stdio: 'inherit' }),
];

const stop = () => {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
