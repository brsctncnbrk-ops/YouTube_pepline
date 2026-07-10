import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const dir = path.dirname(new URL(import.meta.url).pathname);
const b64 = (f) => fs.readFileSync(path.join(dir, 'fonts', f)).toString('base64');
const face = (fam, wght, file) =>
  `@font-face{font-family:'${fam}';font-style:normal;font-weight:${wght};font-display:block;` +
  `src:url(data:font/woff2;base64,${b64(file)}) format('woff2')}`;

const fontface = [
  face('Oswald', 500, 'oswald-latin-500-normal.woff2'),
  face('Oswald', 700, 'oswald-latin-700-normal.woff2'),
  face('Space Mono', 400, 'space-mono-latin-400-normal.woff2'),
  face('Space Mono', 700, 'space-mono-latin-700-normal.woff2'),
  face('Archivo', 400, 'archivo-latin-400-normal.woff2'),
  face('Archivo', 600, 'archivo-latin-600-normal.woff2'),
].join('\n');

let html = fs.readFileSync(path.join(dir, 'banner.html'), 'utf8');
html = html.replace('/*FONTFACE_SLOT*/', fontface);

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath: fs.existsSync(exe) ? exe : undefined,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 20000 });
const bbox = await page.evaluate(() => {
  const w = document.querySelector('.wordmark').getBoundingClientRect();
  const s = document.querySelector('.safe').getBoundingClientRect();
  const first = document.querySelector('.eyebrow').getBoundingClientRect();
  const last = document.querySelector('.tags').getBoundingClientRect();
  return { wl: Math.round(w.left), wr: Math.round(w.right), ww: Math.round(w.width),
           contentTop: Math.round(first.top), contentBottom: Math.round(last.bottom) };
});
console.log('wordmark:', JSON.stringify(bbox));
// mobile-safe zone = 1546x423 centered; log clearance
const safeL = 1280 - 773, safeR = 1280 + 773, safeT = 720 - 211.5, safeB = 720 + 211.5;
console.log(`safe X [${safeL},${safeR}]  wordmark X [${bbox.wl},${bbox.wr}]  -> ${bbox.wl>=safeL && bbox.wr<=safeR ? 'FITS' : 'OVERFLOW'}`);
console.log(`safe Y [${safeT},${safeB}]  content Y [${bbox.contentTop},${bbox.contentBottom}]`);
await page.screenshot({ path: path.join(dir, 'The_Arcavira_Files_banner.png'), clip: { x: 0, y: 0, width: 2560, height: 1440 } });
// crop previews
await page.screenshot({ path: path.join(dir, 'preview_mobile.png'), clip: { x: safeL, y: safeT, width: 1546, height: 423 } });
await page.screenshot({ path: path.join(dir, 'preview_desktop.png'), clip: { x: 0, y: safeT, width: 2560, height: 423 } });
await browser.close();
console.log('rendered');
