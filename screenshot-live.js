const puppeteer = require('puppeteer');
const path = require('path');

const pages = [
  { name: 'home',        url: 'https://www.chiselandgroovestudio.com/' },
  { name: 'about',       url: 'https://www.chiselandgroovestudio.com/about-1' },
  { name: 'gallery',     url: 'https://www.chiselandgroovestudio.com/gallery' },
  { name: 'our-process', url: 'https://www.chiselandgroovestudio.com/our-process' },
  { name: 'contact',     url: 'https://www.chiselandgroovestudio.com/contact' },
];

const outDir = path.join(__dirname);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  for (const { name, url } of pages) {
    console.log(`capturing ${name}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outDir, `live-${name}-mobile.png`), fullPage: true });
    console.log(`done: ${name}`);
  }

  await browser.close();
})();
