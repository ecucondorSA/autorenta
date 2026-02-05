import puppeteer from 'puppeteer';

async function generatePDF() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto(`file:///home/edu/autorenta/tools/whatsapp-context/wa-market-analyzer/output/ecuadorian-top5.html`, {
    waitUntil: 'networkidle0'
  });
  
  await page.pdf({
    path: 'output/ecuadorian-top5.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });
  
  await browser.close();
  console.log('PDF generated: output/ecuadorian-top5.pdf');
}

generatePDF();
