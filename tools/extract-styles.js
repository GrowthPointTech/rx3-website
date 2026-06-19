#!/usr/bin/env node
/**
 * Extract computed styles + full CSS from the live Chisel & Groove website.
 *
 * Usage: node tools/extract-styles.js
 * Output:
 *   reference/computed-styles.json   — getComputedStyle() results per element
 *   reference/site-css.css           — all <style> blocks + stylesheet text
 *   reference/site-fonts.json        — detected font families and weights
 *   reference/site-colors.json       — all unique color values found
 *
 * Squarespace injects styles at runtime via JS — a plain HTTP fetch cannot
 * capture the final computed CSS. Puppeteer renders the full page (including
 * Squarespace's style engine) then extracts computed values.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://www.chiselandgroovestudio.com';

const PROPERTIES = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'text-transform', 'text-decoration',
  'color', 'background-color', 'background-image', 'background-size', 'background-position',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'max-width', 'min-height', 'height',
  'display', 'position', 'text-align', 'vertical-align',
  'border-radius', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'box-shadow', 'opacity', 'overflow',
  'gap', 'row-gap', 'column-gap',
  'flex-direction', 'align-items', 'justify-content',
  'grid-template-columns', 'grid-gap',
];

const PAGES = [
  {
    name: 'home',
    url: '/',
    selectors: {
      // Header / Nav
      'header':              'header, .header-nav-wrapper, [data-section-theme]',
      'nav-logo':            'header img, .header-nav-logo img, .site-header img',
      'nav-link':            'nav a, .header-nav-item a',
      'nav-wrapper':         'nav, .header-nav, .site-nav',

      // Hero section
      'hero-section':        'section:first-of-type, .index-section:first-child',
      'hero-heading':        'h1',
      'hero-body':           'h1 + p, .index-section:first-child p',
      'hero-cta':            'a[href*="gallery"], a[href="/gallery"]',

      // Main content sections
      'section-heading':     'h2',
      'section-body':        'section p',
      'cta-link':            'a[href*="contact"]',

      // Typography
      'body-text':           'body',
      'paragraph':           'p',
      'h3':                  'h3',

      // Footer
      'footer':              'footer',
      'footer-text':         'footer p',
      'footer-link':         'footer a',
    }
  },
  {
    name: 'our-process',
    url: '/our-process',
    selectors: {
      'page-heading':        'h1',
      'process-step-heading':'h2',
      'process-step-body':   'h2 + p, .fe-block p',
      'faq-heading':         'h3',
      'faq-body':            'h3 + p',
    }
  },
  {
    name: 'gallery',
    url: '/gallery',
    selectors: {
      'page-heading':        'h1',
      'gallery-grid':        '.gallery-grid, [class*="gallery"], ul.slides',
      'gallery-item':        '.gallery-grid-item, [class*="gallery-item"]',
      'gallery-caption':     'figcaption, .image-caption',
      'gallery-image':       '.gallery-grid-item img',
    }
  },
  {
    name: 'about',
    url: '/about-1',
    selectors: {
      'page-heading':        'h1',
      'about-body':          'p',
      'about-image':         'img',
    }
  },
  {
    name: 'contact',
    url: '/contact',
    selectors: {
      'page-heading':        'h1',
      'form':                'form',
      'form-input':          'input[type="text"], input[type="email"]',
      'form-textarea':       'textarea',
      'form-label':          'label',
      'submit-button':       'button[type="submit"], input[type="submit"], .form-button',
    }
  }
];

async function extractStyles(page, selectors) {
  const results = {};
  for (const [label, selector] of Object.entries(selectors)) {
    try {
      const styles = await page.evaluate((sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const computed = window.getComputedStyle(el);
        const result = {};
        for (const prop of props) {
          result[prop] = computed.getPropertyValue(prop).trim();
        }
        const rect = el.getBoundingClientRect();
        result['_width']        = Math.round(rect.width) + 'px';
        result['_height']       = Math.round(rect.height) + 'px';
        result['_tag']          = el.tagName.toLowerCase();
        result['_class']        = el.className;
        result['_text-preview'] = el.textContent.trim().substring(0, 100);
        return result;
      }, selector, PROPERTIES);
      results[label] = styles || { _error: `Not found: ${selector}` };
    } catch (e) {
      results[label] = { _error: e.message };
    }
  }
  return results;
}

async function extractAllCSS(page) {
  return await page.evaluate(() => {
    const sheets = [];

    // Grab all <style> blocks
    document.querySelectorAll('style').forEach((s, i) => {
      sheets.push({ type: 'style-block', index: i, text: s.textContent });
    });

    // Grab all loaded stylesheets text (if same-origin or CORS allows)
    for (const sheet of document.styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []).map(r => r.cssText).join('\n');
        sheets.push({ type: 'stylesheet', href: sheet.href, text: rules });
      } catch (e) {
        sheets.push({ type: 'stylesheet', href: sheet.href, text: `/* CORS blocked: ${e.message} */` });
      }
    }

    return sheets;
  });
}

async function extractFontsAndColors(page) {
  return await page.evaluate(() => {
    const fonts  = new Set();
    const colors = new Set();

    const els = document.querySelectorAll('*');
    for (const el of els) {
      const cs = window.getComputedStyle(el);
      const ff = cs.fontFamily;
      const co = cs.color;
      const bg = cs.backgroundColor;
      if (ff) ff.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g, '')));
      if (co && co !== 'rgba(0, 0, 0, 0)') colors.add(co);
      if (bg && bg !== 'rgba(0, 0, 0, 0)') colors.add(bg);
    }

    return {
      fonts:  [...fonts].sort(),
      colors: [...colors].sort(),
    };
  });
}

async function extractImages(page) {
  return await page.evaluate(() => {
    const imgs = [];
    document.querySelectorAll('img').forEach(img => {
      imgs.push({
        src:    img.src,
        alt:    img.alt,
        width:  img.naturalWidth,
        height: img.naturalHeight,
      });
    });
    // Also catch background-image URLs
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) imgs.push({ src: match[1], alt: 'background', width: 0, height: 0 });
      }
    });
    return imgs;
  });
}

async function main() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox']
  });

  const refDir = path.join(__dirname, '..', 'reference');
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });

  const allStyles  = {};
  const allCSS     = [];
  let   fontsColors = null;
  const allImages  = [];

  for (const pageConfig of PAGES) {
    const url = LIVE_URL + pageConfig.url;
    console.log(`\nExtracting: ${pageConfig.name} (${url})`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });

    // Wait for Squarespace JS to finish rendering
    await new Promise(r => setTimeout(r, 3000));

    allStyles[pageConfig.name] = await extractStyles(page, pageConfig.selectors);

    const css = await extractAllCSS(page);
    allCSS.push({ page: pageConfig.name, sheets: css });

    // Grab fonts/colors from home page (representative)
    if (pageConfig.name === 'home') {
      fontsColors = await extractFontsAndColors(page);
    }

    const imgs = await extractImages(page);
    imgs.forEach(img => allImages.push({ page: pageConfig.name, ...img }));

    // Log summary
    for (const [label, styles] of Object.entries(allStyles[pageConfig.name])) {
      if (styles && styles._error) {
        console.log(`  ✗ ${label}: ${styles._error}`);
      } else if (styles) {
        console.log(`  ✓ ${label}: font=${styles['font-family']?.substring(0,30)} size=${styles['font-size']} color=${styles['color']}`);
      }
    }

    await page.close();
  }

  // Write outputs
  fs.writeFileSync(
    path.join(refDir, 'computed-styles.json'),
    JSON.stringify(allStyles, null, 2)
  );
  console.log('\nWritten: reference/computed-styles.json');

  // Flatten all CSS into a single file
  const cssText = allCSS.flatMap(p =>
    p.sheets.map(s => `/* === ${p.page} | ${s.type} ${s.href || ''} === */\n${s.text}`)
  ).join('\n\n');
  fs.writeFileSync(path.join(refDir, 'site-css.css'), cssText);
  console.log('Written: reference/site-css.css');

  if (fontsColors) {
    fs.writeFileSync(
      path.join(refDir, 'site-fonts.json'),
      JSON.stringify({ fonts: fontsColors.fonts }, null, 2)
    );
    fs.writeFileSync(
      path.join(refDir, 'site-colors.json'),
      JSON.stringify({ colors: fontsColors.colors }, null, 2)
    );
    console.log('Written: reference/site-fonts.json');
    console.log('Written: reference/site-colors.json');
  }

  // Deduplicate images
  const uniqueImgs = [...new Map(allImages.map(i => [i.src, i])).values()];
  fs.writeFileSync(
    path.join(refDir, 'site-images.json'),
    JSON.stringify(uniqueImgs, null, 2)
  );
  console.log('Written: reference/site-images.json');

  await browser.close();
  console.log('\nDone! Check the reference/ directory for all outputs.');
}

main().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
