const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'http://localhost:4200';
  const outputPath = process.argv[3] || 'screenshot.png';

  console.log(`Navigating to ${url}...`);
  
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to a typical desktop size
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
      console.log('Network idle timeout hit, capturing anyway...');
    }
    
    // Wait a bit for animations/Three.js if present
    await new Promise(r => setTimeout(r, 2000));

        await page.screenshot({ path: outputPath, fullPage: true });
    
    console.log(`Screenshot saved to ${outputPath}`);
    
    await browser.close();
  } catch (err) {
    console.error('Error taking screenshot:', err);
    process.exit(1);
  }
})();
