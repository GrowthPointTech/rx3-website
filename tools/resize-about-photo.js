/**
 * resize-about-photo.js
 * Center-crops assets/images/about-owner.jpg (1024x1024 square) to the
 * 434:585 portrait aspect ratio actually used on the About page, then
 * downsamples to a 2x-retina target size instead of shipping the full
 * 1024x1024 source for a ~434x585 display box. Re-encodes as WebP
 * (matching every other image asset in this project, which are all
 * WebP files saved with a .jpg extension).
 *
 * Usage: node tools/resize-about-photo.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC = path.join(__dirname, '..', 'assets', 'images', 'about-owner.jpg');

// Target CSS box is aspect-ratio 434/585; export at 2x for retina.
const TARGET_W = 868;
const TARGET_H = 1170;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();

  const fileUrl = 'file:///' + SRC.replace(/\\/g, '/');
  const tmpHtml = path.join(__dirname, '..', 'assets', 'images', '__resize-tmp.html');
  fs.writeFileSync(tmpHtml, '<!doctype html><html><body></body></html>');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'));

  const dataUrl = await page.evaluate(async (src, w, h) => {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

    // Center-crop the square source to the target aspect ratio, then draw at target size.
    const targetAspect = w / h;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    const srcAspect = sw / sh;
    if (srcAspect > targetAspect) {
      // source wider than target -> crop width
      sw = sh * targetAspect;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      // source taller than target -> crop height
      sh = sw / targetAspect;
      sy = (img.naturalHeight - sh) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

    return canvas.toDataURL('image/webp', 0.85);
  }, fileUrl, TARGET_W, TARGET_H);

  await browser.close();
  fs.unlinkSync(tmpHtml);

  const base64 = dataUrl.replace(/^data:image\/webp;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(SRC, buffer);

  console.log(`Wrote ${SRC}`);
  console.log(`New size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(1)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });
