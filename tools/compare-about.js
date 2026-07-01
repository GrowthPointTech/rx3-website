/**
 * compare-about.js
 * Band-by-band computed-style + screenshot comparison of the About page:
 * live Squarespace site vs local rebuild. Run local server first (npm run serve).
 *
 * Usage: node tools/compare-about.js [desktop|tablet|mobile]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LIVE_URL  = 'https://www.chiselandgroovestudio.com/about-1';
const LOCAL_URL = 'http://localhost:3000/about.html';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, '..');
const REF_DIR = path.join(OUT_DIR, 'reference');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 834,  height: 1194 },
  mobile:  { width: 390,  height: 844 },
};

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-transform', 'text-align',
  'color', 'background-color',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'display', 'grid-template-columns', 'gap',
  'width', 'max-width', 'height', 'object-fit', 'object-position',
];

// label -> { live: selector, local: selector }
const ELEMENTS = {
  'nav':              { live: 'header, .header-nav-wrapper',            local: '.nav' },
  'nav-logo':         { live: '.header-nav-logo img, header img',       local: '.nav__logo img' },
  'nav-link':         { live: '.header-nav-item a, nav a',              local: '.nav__link' },

  'hero-section':     { live: '[data-section-id="67aa898d5e222c5566de7e06"]', local: '.about-hero' },
  'hero-title':       { live: '[data-section-id="67aa898d5e222c5566de7e06"] h1', local: '.about-hero .hero__title' },
  'hero-overlay':     { live: '[data-section-id="67aa898d5e222c5566de7e06"] .section-background-overlay', local: '.about-hero .hero__overlay' },

  'content-section':  { live: '[data-section-id="67aa8a0f1e357d3f76a2355f"]', local: '.about-section' },
  'content-grid':      { live: '.fe-67aa8a0f1e357d3f76a2355e',           local: '.about-content' },
  'about-image':      { live: '#block-4fd5f14c33efbeb84a76 img',        local: '.about-owner-photo' },
  'about-title':      { live: '#block-yui_3_17_2_1_1739813897250_20182 p:nth-of-type(1)', local: '.about-title' },
  'about-body':       { live: '#block-yui_3_17_2_1_1739813897250_20182 p:nth-of-type(2)', local: '.about-body' },
  'about-attribution':{ live: '#block-yui_3_17_2_1_1739813897250_20182 p:nth-of-type(3)', local: '.about-attribution' },

  'footer':           { live: '#footer-sections',                       local: '.footer' },
  'footer-wordmark':  { live: '#footer-sections h3',                    local: '.footer__wordmark' },
  'footer-link':      { live: '#footer-sections a[href*="privacy"]',    local: '.footer__link' },
  'footer-copy':      { live: '#footer-sections p:last-of-type',        local: '.footer__copy' },
};

async function getStyles(page, selectors) {
  const results = {};
  for (const [label, selector] of Object.entries(selectors)) {
    results[label] = await page.evaluate((sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return { _error: `not found: ${sel}` };
      const cs = window.getComputedStyle(el);
      const out = { _tag: el.tagName, _text: el.textContent.trim().slice(0, 90) };
      for (const p of props) out[p] = cs.getPropertyValue(p).trim();
      const r = el.getBoundingClientRect();
      out._width = Math.round(r.width) + 'px';
      out._height = Math.round(r.height) + 'px';
      out._top = Math.round(r.top) + 'px';
      return out;
    }, selector, PROPS).catch((e) => ({ _error: 'eval failed: ' + e.message }));
  }
  return results;
}

async function capture(browser, url, viewport, label) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  console.log(`  Loading ${url} @ ${viewport.width}x${viewport.height}...`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));

  const shotPath = path.join(REF_DIR, `about-${label}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`  Screenshot: reference/about-${label}.png`);

  const elementLabels = {};
  for (const [key, sels] of Object.entries(ELEMENTS)) {
    elementLabels[key] = sels[label === 'live' ? 'live' : 'local'];
  }
  const styles = await getStyles(page, elementLabels);
  await page.close();
  return styles;
}

function diffStyles(live, local) {
  const diffs = {};
  for (const element of Object.keys(ELEMENTS)) {
    const l = live[element] || {};
    const p = local[element] || {};
    const elementDiffs = {};

    if (l._error || p._error) {
      elementDiffs._status = `live: ${l._error || 'ok'} | local: ${p._error || 'ok'}`;
      diffs[element] = elementDiffs;
      continue;
    }

    for (const prop of PROPS) {
      const lVal = l[prop] || '';
      const pVal = p[prop] || '';
      if (lVal !== pVal) elementDiffs[prop] = { live: lVal, local: pVal };
    }
    // also compare dimensions
    for (const dim of ['_width', '_height']) {
      if (l[dim] !== p[dim]) elementDiffs[dim] = { live: l[dim], local: p[dim] };
    }

    if (Object.keys(elementDiffs).length > 0) {
      elementDiffs._liveText  = l._text;
      elementDiffs._localText = p._text;
      diffs[element] = elementDiffs;
    }
  }
  return diffs;
}

function printDiff(diffs) {
  if (Object.keys(diffs).length === 0) {
    console.log('\n✓ No meaningful diffs found on the About page.');
    return;
  }
  console.log('\n=== ABOUT PAGE STYLE DIFF (live vs local) ===\n');
  for (const [element, props] of Object.entries(diffs)) {
    console.log(`── ${element} ──`);
    if (props._status) { console.log(`   ${props._status}`); continue; }
    console.log(`   live text:  "${props._liveText}"`);
    console.log(`   local text: "${props._localText}"`);
    for (const [prop, vals] of Object.entries(props)) {
      if (prop.startsWith('_')) continue;
      console.log(`   ${prop.padEnd(24)} live: ${String(vals.live).padEnd(36)} local: ${vals.local}`);
    }
    console.log('');
  }
}

async function main() {
  const mode = process.argv[2] || 'desktop';
  const viewport = VIEWPORTS[mode];
  if (!fs.existsSync(REF_DIR)) fs.mkdirSync(REF_DIR, { recursive: true });

  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });

  console.log(`\n[1/2] Capturing live (${mode})...`);
  const liveStyles = await capture(browser, LIVE_URL, viewport, 'live');

  console.log(`\n[2/2] Capturing local (${mode})...`);
  const localStyles = await capture(browser, LOCAL_URL, viewport, 'local');

  await browser.close();

  const diffs = diffStyles(liveStyles, localStyles);
  fs.writeFileSync(
    path.join(REF_DIR, `about-diff-${mode}.json`),
    JSON.stringify({ mode, viewport, live: liveStyles, local: localStyles, diffs }, null, 2)
  );
  console.log(`\nWritten: reference/about-diff-${mode}.json`);

  printDiff(diffs);
}

main().catch(e => { console.error(e); process.exit(1); });
