const { chromium } = require('patchright');

(async () => {
  const userDataDir = '/home/edu/.patchright-profile';
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  try {
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle' });
    
    // Look for the input area
    const inputSelector = 'div[contenteditable="true"]';
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    
    const prompt = "Analiza la identidad personal de Eduardo: ¿quién es, dónde vive, cuáles son sus redes sociales, sus intereses personales y su trayectoria profesional? Dame un perfil psicográfico y biográfico completo.";
    
    await page.fill(inputSelector, prompt);
    await page.keyboard.press('Enter');
    
    console.log('Prompt sent. Waiting for response...');
    
    // Wait for the response to start and finish
    await page.waitForTimeout(15000); 
    
    const screenshotPath = 'gemini_edu_analysis.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Analysis completed. Screenshot saved to ' + screenshotPath);
    
    // Try to extract the text of the last response
    const responses = await page.evaluate(() => {
      const elements = document.querySelectorAll('.model-response-text'); // This selector might need adjustment
      return Array.from(elements).map(e => e.innerText).pop();
    });
    
    console.log('EXTRACTED_TEXT_START');
    console.log(responses || 'Could not extract text automatically.');
    console.log('EXTRACTED_TEXT_END');

  } catch (err) {
    console.error('Error during Gemini interaction:', err);
    await page.screenshot({ path: 'gemini_error.png' });
  } finally {
    await browser.close();
  }
})();
