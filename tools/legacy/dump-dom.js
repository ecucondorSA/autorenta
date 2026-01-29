const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://localhost:4200';
  const outputPath = process.argv[3] || 'page_dump.html';

  console.log(`Analyzing structure of ${url}...`);
  
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
      console.log('Timeout waiting for network, proceeding with current state...');
    }
    
    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 2000));

    // Extract the full HTML structure
    const content = await page.content();
    
    // Extract visible text (what the user actually sees)
    const visibleText = await page.evaluate(() => document.body.innerText);

    fs.writeFileSync(outputPath, content);
    fs.writeFileSync(outputPath + '.txt', visibleText);
    
    console.log(`DOM structure saved to ${outputPath}`);
    console.log(`Visible text saved to ${outputPath}.txt`);
    
    await browser.close();
  } catch (err) {
    console.error('Error dumping DOM:', err);
    process.exit(1);
  }
})();
