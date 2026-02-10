const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const widths = [320, 360, 390, 414, 768];
  const pages = [
    { slug: 'index', url: 'https://libreria-belen.com/' },
    { slug: 'catalog', url: 'https://libreria-belen.com/catalog.html' },
    { slug: 'about', url: 'https://libreria-belen.com/about.html' },
    { slug: 'support', url: 'https://libreria-belen.com/support.html' }
  ];

  const outDir = path.join(process.cwd(), 'tmp-mobile-audit');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
      const page = await context.newPage();

      for (const p of pages) {
        await page.goto(`${p.url}?audit=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);
        const file = path.join(outDir, `${p.slug}-${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log('done');
})();
