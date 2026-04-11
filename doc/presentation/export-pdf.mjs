/**
 * Renders the Code City presentation to a PDF file.
 * Each slide becomes one landscape page (16:9, 1600x900 px).
 *
 * Setup (one-time):
 *   cd doc/presentation
 *   npm install
 *   npx playwright install chromium
 *
 * Usage:
 *   node export-pdf.mjs [output.pdf]
 *   npm run export-pdf
 */
import { chromium }    from 'playwright';
import { PDFDocument }  from 'pdf-lib';
import * as fs          from 'fs';
import * as path        from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ── Config ────────────────────────────────────────────────────────────────────
const SLIDE_FILE = path.join(__dirname, 'index.html');
const OUTPUT     = process.argv[2] ?? path.join(__dirname, 'code-city-talk.pdf');
const VIEWPORT   = { width: 1600, height: 900 };
const SCALE      = 2;     // device pixel ratio (retina quality)
const SETTLE_MS  = 200;   // ms to settle after each slide change
// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function readSlideCount(page) {
  return page.evaluate(() => {
    const t = document.getElementById('slideCounter')?.textContent ?? '1 / 1';
    const m = t.match(/\d+\s*\/\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  });
}
async function gotoSlide(page, index) {
  await page.evaluate(i => {
    // app.js exposes jumpTo() globally.
    // eslint-disable-next-line no-undef
    if (typeof jumpTo === 'function') jumpTo(i);
  }, index);
  await sleep(SETTLE_MS);
}
// ── Capture screenshots ───────────────────────────────────────────────────────
console.log('Launching Chromium headless...');
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
});
const page = await context.newPage();
const fileUrl = 'file://' + SLIDE_FILE.replace(/\\/g, '/');
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await sleep(500);
// Reset to first slide.
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
});
await sleep(SETTLE_MS);
const total = await readSlideCount(page);
console.log(`Presentation has ${total} slides.`);
const pngs = [];
for (let i = 0; i < total; i++) {
  await gotoSlide(page, i);
  const buf = await page.screenshot({ type: 'png' });
  pngs.push(buf);
  process.stdout.write(`  Captured ${i + 1} / ${total}\r`);
}
process.stdout.write('\n');
await browser.close();
// ── Assemble PDF with pdf-lib ─────────────────────────────────────────────────
console.log('Assembling PDF...');
const doc = await PDFDocument.create();
for (let i = 0; i < pngs.length; i++) {
  const img  = await doc.embedPng(pngs[i]);
  // Use the actual pixel dimensions so the page is pixel-perfect 16:9.
  const w    = img.width  / SCALE;
  const h    = img.height / SCALE;
  const page = doc.addPage([w, h]);
  page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  process.stdout.write(`  Embedded slide ${i + 1} / ${pngs.length}\r`);
}
process.stdout.write('\n');
const pdfBytes = await doc.save();
fs.writeFileSync(OUTPUT, pdfBytes);
const mb = (pdfBytes.length / 1024 / 1024).toFixed(1);
console.log(`Done -> ${OUTPUT}  (${mb} MB, ${pngs.length} pages)`);
