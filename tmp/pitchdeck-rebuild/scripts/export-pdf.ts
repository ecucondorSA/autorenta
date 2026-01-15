import { chromium } from 'playwright';

const TOTAL_SLIDES = 26;
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

const lang = process.argv[2] || 'es';

async function exportToPDF() {
  console.log('Starting PDF export...');

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    viewport: {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT
    }
  });

  // Navigate to the app with all slides visible
  console.log('Loading slides...');
  await page.goto(`http://localhost:3000?lang=${lang}`);

  // Click "Todas" (or fallback to "All") to show all slides
  const todas = page.locator('button:has-text("Todas")');
  if (await todas.count()) {
    await todas.first().click();
  } else {
    await page.click('button:has-text("All")');
  }
  await page.waitForSelector('#all-slides');

  // Wait for all slides to render
  await page.waitForTimeout(2000);

  // Generate PDF
  console.log('Generating PDF...');
  const pdfPath = `/home/edu/autorenta/tmp/pitchdeck-rebuild/autorenta-pitchdeck-${lang}.pdf`;

  await page.pdf({
    path: pdfPath,
    width: `${SLIDE_WIDTH}px`,
    height: `${SLIDE_HEIGHT}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false
  });

  console.log(`PDF exported to: ${pdfPath}`);

  await browser.close();
  console.log('Done!');
}

// Alternative: Export individual slide screenshots and combine
async function exportSlidesToImages() {
  console.log('Starting image export...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT
    }
  });

  await page.goto('http://localhost:3000');

  for (let i = 0; i < TOTAL_SLIDES; i++) {
    // Navigate to slide using keyboard
    if (i > 0) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }

    const filename = `/home/edu/autorenta/tmp/pitchdeck-rebuild/slides/slide-${String(i + 1).padStart(2, '0')}.png`;
    await page.locator('.slide').screenshot({
      path: filename,
      type: 'png'
    });
    console.log(`Exported slide ${i + 1}/${TOTAL_SLIDES}`);
  }

  await browser.close();
  console.log('All slides exported!');
}

// Run export
exportToPDF().catch(console.error);
