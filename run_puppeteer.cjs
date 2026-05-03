const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:3000/contas', { waitUntil: 'networkidle2' });
    
    // wait for the tab to appear and click it
    await page.waitForXPath("//button[contains(text(), 'Maquininhas')]", { timeout: 5000 });
    const [tab] = await page.$x("//button[contains(text(), 'Maquininhas')]");
    if (tab) {
      await tab.click();
      await page.waitForTimeout(2000); // Wait for potential crash
    } else {
      console.log('Tab not found');
    }
  } catch (err) {
    console.log('SCRIPT ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
