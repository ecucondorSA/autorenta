import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || getGcloudProject();
const LOCATION = 'us-central1'; // Imagen is typically available here
const API_ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagegeneration@005:predict`;

const ASSETS_DIR = 'src/assets';

// List of images to generate
const IMAGES_TO_GENERATE = [
  {
    path: 'avatar-placeholder.png', // Keeping extension png for compatibility, but content will be png
    prompt: 'A friendly, professional 3D user avatar, circular frame composition, soft lighting, neutral background, modern UI style, high resolution, minimalist character headshot.',
    type: 'avatar'
  },
  {
    path: 'images/empty-states/empty-bookings.webp', // Replacing svg with webp
    prompt: 'A stylized 3D illustration of a calendar with a car key nearby, floating in a clean void, soft pastel colors, minimalist, signifying no bookings found, high quality render, isometric view.',
    type: 'illustration'
  },
  {
    path: 'images/empty-states/empty-messages.webp',
    prompt: 'A stylized 3D illustration of an empty speech bubble or open mailbox, clean, modern, soft blue and white tones, high quality render, minimal empty state.',
    type: 'illustration'
  },
  {
    path: 'images/empty-states/empty-notifications.webp',
    prompt: 'A stylized 3D illustration of a notification bell icon sleeping or resting zzz, soft colors, minimalist, high quality render, smooth materials.',
    type: 'illustration'
  },
  {
    path: 'images/empty-states/empty-wallet.webp',
    prompt: 'A stylized 3D illustration of a digital wallet, open and empty, clean, modern, soft shadows, high quality render, financial tech style.',
    type: 'illustration'
  },
  {
    path: 'images/empty-states/empty-search.webp',
    prompt: 'A stylized 3D illustration of a magnifying glass searching over a simple map pin, void background, clean style, searching for cars concept.',
    type: 'illustration'
  },
  {
    path: 'images/ui/empty-search-street.webp',
    prompt: 'A cinematic, slightly blurred background image of a quiet, beautiful modern residential street at golden hour, empty of cars, high resolution, photorealistic, warm lighting.',
    type: 'background'
  }
];

function getGcloudProject() {
  try {
    return execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
  } catch (e) {
    console.warn('⚠️ Could not get project ID from gcloud. Please set GOOGLE_CLOUD_PROJECT env var.');
    return null;
  }
}

function getAccessToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
  } catch (e) {
    console.error('❌ Could not get access token. Make sure you are logged in with `gcloud auth login`.');
    process.exit(1);
  }
}

async function generateImage(item, token) {
  console.log(`🎨 Generating: ${item.path}...`);
  console.log(`   Prompt: "${item.prompt}"`);

  const requestBody = {
    instances: [
      {
        prompt: item.prompt
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: item.type === 'background' ? '16:9' : '1:1',
      personGeneration: 'allow_adult' // Standard setting
    }
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.predictions || !data.predictions[0] || !data.predictions[0].bytesBase64Encoded) {
      throw new Error('Invalid response format: No image data found.');
    }

    const base64Image = data.predictions[0].bytesBase64Encoded;
    const buffer = Buffer.from(base64Image, 'base64');

    // Ensure directory exists
    const fullPath = path.join(ASSETS_DIR, item.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Save file
    await fs.writeFile(fullPath, buffer);
    console.log(`✅ Saved to ${fullPath}`);

  } catch (error) {
    console.error(`❌ Failed to generate ${item.path}:`, error.message);
  }
}

async function main() {
  if (!PROJECT_ID) {
    console.error('❌ No Google Cloud Project ID found.');
    process.exit(1);
  }

  console.log(`🚀 Starting generation for project: ${PROJECT_ID}`);
  const token = getAccessToken();

  for (const item of IMAGES_TO_GENERATE) {
    await generateImage(item, token);
  }
  
  console.log('✨ All tasks completed.');
}

main();
