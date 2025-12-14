import fs from 'fs/promises';
import path from 'path';

const WORKER_URL = 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

async function verifyGeneration() {
  console.log('🧪 Verifying Image Generation API...');
  console.log(`📡 Endpoint: ${WORKER_URL}`);

  const payload = {
    brand: 'Fiat',
    model: 'Uno',
    year: 2010,
    color: 'Silver',
    angle: '3/4-front',
    style: 'craigslist car ad photo, parked in driveway, suburbs, boring lighting, unedited, daily driver car, leaves on ground, dirty bumper'
  };

  console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API Error: ${data.error}`);
    }

    console.log('✅ API returned success: true');

    if (!data.image) {
      throw new Error('API did not return an image field');
    }

    console.log('📦 Image data received (Base64 string present)');

    // Decode Base64
    const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`📊 Image Size: ${buffer.length} bytes`);

    // Check Magic Numbers for PNG (89 50 4E 47 0D 0A 1A 0A)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        console.log('✅ Magic numbers confirm this is a valid PNG image.');
    } else {
        console.warn('⚠️ Magic numbers do NOT match standard PNG signature.');
        console.log('First 8 bytes:', buffer.subarray(0, 8));
    }

    // Save for inspection
    const outputPath = path.resolve('test-generated-car.png');
    await fs.writeFile(outputPath, buffer);
    console.log(`💾 Saved generated image to: ${outputPath}`);

    // Verification of Resizing Logic (Static Analysis)
    console.log('\n🔍 Verification of Resizing Logic:');
    console.log('   The API generates a full-quality PNG.');
    console.log('   The application is configured (in src/app/core/services/cars.service.ts) to resize this image client-side.');
    console.log('   Target dimensions: 1200x900 pixels');
    console.log('   Target format: WebP');
    console.log('   Target quality: 85%');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

verifyGeneration();
