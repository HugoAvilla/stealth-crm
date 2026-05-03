import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  try {
    await page.goto('http://localhost:8081/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:8081/login', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'hugo.avilla@icloud.com');
    await page.type('input[type="password"]', 'Hugo@123');
    await page.click('button[type="submit"]');
    
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
    await page.goto('http://localhost:8081/contas', { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 2000));

    const accounts = await page.$$('div.flex.md\\:flex-col.gap-2 > button');
    if (accounts.length > 0) {
      console.log(`Found ${accounts.length} accounts, clicking first...`);
      await accounts[0].click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const tabs = await page.$$('button');
    let maquininhasTab = null;
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Maquininhas')) {
        maquininhasTab = tab;
        break;
      }
    }
    
    if (maquininhasTab) {
      console.log('Found tab, clicking...');
      await maquininhasTab.click();
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('Tab not found');
    }
  } catch(e) {
    console.log('SCRIPT ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
