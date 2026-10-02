// Records the tour film (the /tour-film page) into public/tour.webm.
//
//   1. Start the web app:            npm run dev
//   2. In any folder outside the app: npm i playwright-core && npx playwright-core install ffmpeg
//   3. Run from that folder:          node <path>/web/scripts/record-tour.mjs
//
// Uses the Chrome already installed on this machine. playwright-core is not a
// dependency of the app, so it has to be resolvable from where this is run.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright-core');

const URL = process.env.TOUR_URL ?? 'http://localhost:3000/tour-film';
const SIZE = { width: 1600, height: 900 };
// The sum of every scene's `ms` in tour-film.tsx, plus a moment on the closing card.
const FILM_MS = Number(process.env.TOUR_MS ?? 126000) + 1500;
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/tour.webm');
const tmp = join(process.cwd(), '.tour-recording');

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// Warm the page first, so the recorded load is quick and the lead-in to trim is short.
const warm = await browser.newPage({ viewport: SIZE });
await warm.goto(URL, { waitUntil: 'networkidle' });
await warm.close();

const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: SIZE }, reducedMotion: 'no-preference' });
const opened = Date.now();
const page = await context.newPage();
// The dev-mode Next.js badge is not part of the film.
await page.addInitScript(() => {
  const style = document.createElement('style');
  style.textContent = 'nextjs-portal{display:none!important}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
});
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[role=dialog]');
const leadIn = (Date.now() - opened) / 1000;
console.log(`Film started ${leadIn.toFixed(2)}s into the recording. Recording ${(FILM_MS / 1000).toFixed(0)}s…`);
await page.waitForTimeout(FILM_MS);
await context.close();
await browser.close();

const raw = join(tmp, readdirSync(tmp).find((f) => f.endsWith('.webm')));

// Cut off the page load at the start, using the ffmpeg that Playwright installs for itself.
const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? (process.platform === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : process.platform === 'darwin' ? join(homedir(), 'Library/Caches/ms-playwright') : join(homedir(), '.cache/ms-playwright'));
const dir = existsSync(cache) ? readdirSync(cache).find((d) => d.startsWith('ffmpeg')) : undefined;
const ffmpeg = dir && join(cache, dir, readdirSync(join(cache, dir)).find((n) => n.startsWith('ffmpeg')) ?? '');
if (ffmpeg && existsSync(ffmpeg)) {
  execFileSync(ffmpeg, ['-y', '-ss', leadIn.toFixed(2), '-i', raw, '-c:v', 'libvpx', '-b:v', '1300k', '-crf', '14', '-an', out], { stdio: 'ignore' });
} else {
  console.warn('ffmpeg not found; keeping the untrimmed recording.');
  renameSync(raw, out);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${out} (${(statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
