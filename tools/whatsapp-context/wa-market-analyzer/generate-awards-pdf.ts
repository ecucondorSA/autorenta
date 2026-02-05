import puppeteer from 'puppeteer';

async function generatePDF() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto(`file:///home/edu/autorenta/tools/whatsapp-context/wa-market-analyzer/output/ecuadorian-community-awards.html`, {
    waitUntil: 'networkidle0'
  });
  
  await page.pdf({
    path: 'output/premios-comunidad-ecuatoriana-2026.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
  });
  
  await browser.close();
  console.log('PDF generated: output/premios-comunidad-ecuatoriana-2026.pdf');
}

generatePDF();
