import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  try {
    try {
      await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
      
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.type('input[type="email"]', 'admin@stealth.com');
      await page.type('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete by waiting for the dashboard to load (or any element that indicates success)
      await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
      await page.goto('http://localhost:8080/contas', { waitUntil: 'networkidle2' });
    } catch (e) {
      console.log('Login failed:', e.message);
    }

    // Wait for the page to load
    await new Promise(r => setTimeout(r, 2000));

    // Try to click the first account if it exists to make sure the main content is visible
    const accounts = await page.$$('div.flex.md\\:flex-col.gap-2 > button');
    if (accounts.length > 0) {
      console.log(`Found ${accounts.length} accounts, clicking first...`);
      await accounts[0].click();
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log('No accounts found! The page might not have loaded correctly.');
    }
    
    await page.screenshot({ path: 'before_click.png' });

    console.log('Searching for tabs...');
    const tabs = await page.$$('button');
    let maquininhasTab = null;
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text) {
        console.log(`Found button with text: ${text.trim()}`);
      }
      if (text && text.includes('Maquininhas')) {
        maquininhasTab = tab;
        break;
      }
    }
    
    if (maquininhasTab) {
      console.log('Found tab, clicking...');
      await maquininhasTab.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: 'after_click.png' });
    } else {
      console.log('Tab not found');
      // Dump the HTML body to understand what's on the page
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log('Page HTML length:', html.length);
    }
  } catch(e) {
    console.log('SCRIPT ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
