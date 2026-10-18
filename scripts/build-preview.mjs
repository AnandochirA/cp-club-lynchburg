/**
 * Builds the static preview: the same site with no server, so it can be
 * hosted as plain files. API routes and /admin are excluded, because a
 * static export has nowhere to run them.
 *
 *   npm run build:preview   ->  out/
 */
import { cp, rm, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const stage = path.join(root, '.preview-build');

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

for (const entry of await readdir(root)) {
  if (['node_modules', '.next', '.git', 'out', '.preview-build'].includes(entry)) continue;
  await cp(path.join(root, entry), path.join(stage, entry), { recursive: true });
}

// A static export cannot carry server-only routes. Add any new page that reads
// the database or cookies (like /me and /signin) here, or this build breaks.
for (const dir of ['src/app/api', 'src/app/admin', 'src/app/me', 'src/app/signin', 'src/app/rooms', 'src/app/interview']) {
  await rm(path.join(stage, dir), { recursive: true, force: true });
}

// On Windows `npx` is `npx.cmd`, which execFileSync can only run through a shell.
execFileSync('npx', ['next', 'build'], {
  cwd: stage,
  shell: process.platform === 'win32',
  stdio: 'inherit',
  env: { ...process.env, STATIC_EXPORT: '1', NEXT_PUBLIC_STATIC_PREVIEW: '1' },
});

await rm(path.join(root, 'out'), { recursive: true, force: true });
await cp(path.join(stage, 'out'), path.join(root, 'out'), { recursive: true });

// Next writes absolute /_next/... paths. The preview may be served from a
// subpath, so rewrite them relative to the file that references them.
const outDir = path.join(root, 'out');

// Some static hosts reserve names beginning with "_", so the asset folder is
// renamed and every reference to it rewritten.
const ASSETS = 'assets';
await rm(path.join(outDir, ASSETS), { recursive: true, force: true });
await cp(path.join(outDir, '_next'), path.join(outDir, ASSETS), { recursive: true });
await rm(path.join(outDir, '_next'), { recursive: true, force: true });
// build manifests are unreferenced in an app-router export, and also start with "_"
for (const dir of await readdir(path.join(outDir, ASSETS, 'static'))) {
  if (/^[A-Za-z0-9_-]{15,}$/.test(dir)) {
    await rm(path.join(outDir, ASSETS, 'static', dir), { recursive: true, force: true });
  }
}

const indexPath = path.join(outDir, 'index.html');
if (existsSync(indexPath)) {
  let html = await readFile(indexPath, 'utf8');
  html = html.replaceAll('/_next/', `./${ASSETS}/`);
  // the legacy polyfill bundle targets browsers this site does not support
  html = html.replace(/<script[^>]*src="[^"]*polyfills[^"]*"[^>]*><\/script>/g, '');
  await writeFile(indexPath, html, 'utf8');
}
for (const f of await readdir(path.join(outDir, ASSETS, 'static', 'chunks'))) {
  if (f.startsWith('polyfills')) await rm(path.join(outDir, ASSETS, 'static', 'chunks', f));
}
const cssDir = path.join(outDir, ASSETS, 'static', 'css');
if (existsSync(cssDir)) {
  for (const f of await readdir(cssDir)) {
    const p = path.join(cssDir, f);
    const css = await readFile(p, 'utf8');
    // a stylesheet at _next/static/css/x.css reaching _next/static/media/y
    await writeFile(p, css.replaceAll('/_next/static/media/', '../media/'), 'utf8');
  }
}

await rm(stage, { recursive: true, force: true });
console.log('\npreview built -> out/');
