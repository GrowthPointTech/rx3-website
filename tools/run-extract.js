#!/usr/bin/env node
/**
 * Run from gp-website dir (where puppeteer is installed):
 *   cd ~/Documents/Git/gp-website && node ../rx3-website/tools/run-extract.js
 */

const puppeteer = require('/Users/staceyrobinson/Documents/Git/gp-website/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://www.chiselandgroovestudio.com';
const refDir = path.join(__dirname, '..', 'reference');
if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });

const PROPERTIES = [
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-transform',
  'color', 'background-color', 'background-image',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'max-width', 'min-height', 'height',
  'display', 'position', 'text-align',
  'border-radius', 'border', 'box-shadow', 'opacity',
  'gap', 'flex-direction', 'align-items', 'justify-content',
];

const PAGES = [
  { name: 'home',        url: '/' },
  { name: 'our-process', url: '/our-process' },
  { name: 'gallery',     url: '/gallery' },
  { name: 'about',       url: '/about-1' },
  { name: 'contact',     url: '/contact' },
];

const SELECTORS = {
  'body':       'body',
  'header':     'header',
  'nav-link':   'nav a',
  'h1':         'h1',
  'h2':         'h2',
  'h3':         'h3',
  'paragraph':  'p',
  'a-link':     'a',
  'footer':     'footer',
  'footer-p':   'footer p',
};

async function getStyles(page) {
  const styles = {};
  for (const [label, sel] of Object.entries(SELECTORS)) {
    try {
      const result = await page.evaluate((s, props) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        const r = {};
        for (const p of props) r[p] = cs.getPropertyValue(p).trim();
        r._tag   = el.tagName;
        r._class = el.className.substring(0, 80);
        r._text  = el.textContent.trim().substring(0, 80);
        const rect = el.getBoundingClientRect();
        r._w = Math.round(rect.width) + 'px';
        r._h = Math.round(rect.height) + 'px';
        return r;
      }, sel, PROPERTIES);
      styles[label] = result || { _error: 'not found' };
    } catch (e) {
      styles[label] = { _error: e.message };
    }
  }
  return styles;
}

async function getCSS(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('style').forEach((s, i) => {
      out.push({ type: 'style-block', index: i, text: s.textContent });
    });
    for (const sh of document.styleSheets) {
      try {
        const rules = Array.from(sh.cssRules || []).map(r => r.cssText).join('\n');
        out.push({ type: 'sheet', href: sh.href, text: rules });
      } catch (e) {
        out.push({ type: 'sheet', href: sh.href, text: '/* CORS blocked */' });
      }
    }
    return out;
  });
}

async function getFontsAndColors(page) {
  return page.evaluate(() => {
    const fonts  = new Set();
    const colors = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = window.getComputedStyle(el);
      cs.fontFamily.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g, '')));
      if (cs.color !== 'rgba(0, 0, 0, 0)')            colors.add(cs.color);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(cs.backgroundColor);
    }
    return { fonts: [...fonts].sort(), colors: [...colors].sort() };
  });
}

async function getImages(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('img').forEach(img => {
      out.push({ src: img.src, alt: img.alt, w: img.naturalWidth, h: img.naturalHeight });
    });
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m && !m[1].startsWith('data:')) out.push({ src: m[1], alt: 'bg', w: 0, h: 0 });
      }
    });
    return out;
  });
}

async function main() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox'],
  });

  const allStyles = {};
  const allCSS    = [];
  let fontsColors = null;
  const allImages = [];

  for (const pc of PAGES) {
    const url = LIVE_URL + pc.url;
    console.log('\nPage:', pc.name, url);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    const styles = await getStyles(page);
    allStyles[pc.name] = styles;
    for (const [label, s] of Object.entries(styles)) {
      if (s && s._error) console.log('  x', label, s._error);
      else if (s)        console.log('  +', label, '|', s['font-family']?.substring(0,25), s['font-size'], s['color']);
    }

    const css = await getCSS(page);
    allCSS.push({ page: pc.name, sheets: css });

    if (pc.name === 'home') {
      fontsColors = await getFontsAndColors(page);
      console.log('  Fonts found:', fontsColors.fonts.slice(0, 8).join(', '));
      console.log('  Colors found:', fontsColors.colors.slice(0, 8).join(', '));
    }

    const imgs = await getImages(page);
    imgs.forEach(img => allImages.push({ page: pc.name, ...img }));
    console.log('  Images:', imgs.length);

    await page.close();
  }

  fs.writeFileSync(refDir + '/computed-styles.json', JSON.stringify(allStyles, null, 2));
  console.log('\nWritten: computed-styles.json');

  const cssText = allCSS
    .flatMap(p => p.sheets.map(s => `/* === ${p.page} | ${s.type} ${s.href || ''} === */\n${s.text}`))
    .join('\n\n');
  fs.writeFileSync(refDir + '/site-css.css', cssText);
  console.log('Written: site-css.css');

  if (fontsColors) {
    fs.writeFileSync(refDir + '/site-fonts.json', JSON.stringify(fontsColors.fonts, null, 2));
    fs.writeFileSync(refDir + '/site-colors.json', JSON.stringify(fontsColors.colors, null, 2));
    console.log('Written: site-fonts.json, site-colors.json');
  }

  const uniqueImgs = [...new Map(allImages.map(i => [i.src, i])).values()];
  fs.writeFileSync(refDir + '/site-images.json', JSON.stringify(uniqueImgs, null, 2));
  console.log('Written: site-images.json (' + uniqueImgs.length + ' images)');

  await browser.close();
  console.log('\nDone! Review reference/ to build the static clone.');
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
