#!/usr/bin/env node

/**
 * Script to apply AI-generated textures to GLB models using Tripo API
 * Usage: node texturize-glb.js <glb-file-path> <texture-prompt>
 * Example: node texturize-glb.js model.glb "red metallic sports car with chrome details"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const TRIPO_API_KEY = process.env.TRIPO_API_KEY || 'tsk_1kPSiPNNEeD79J8iKnIDLPEotzXLqLqe';
const TRIPO_API_URL = 'https://api.tripo3d.ai/v2/openapi/task';

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node texturize-glb.js <glb-file-path> <texture-prompt>');
  console.error('Example: node texturize-glb.js model.glb "red metallic car paint"');
  process.exit(1);
}

const glbFilePath = args[0];
const texturePrompt = args[1];

// Validate file exists
if (!fs.existsSync(glbFilePath)) {
  console.error(`Error: File not found: ${glbFilePath}`);
  process.exit(1);
}

console.log(`🎨 Starting texturization process...`);
console.log(`📁 Model file: ${glbFilePath}`);
console.log(`💬 Texture prompt: "${texturePrompt}"`);
console.log('');

/**
 * Upload GLB file to a temporary hosting service (we'll use file.io for this example)
 * In production, you'd use your own file hosting (S3, Cloudinary, etc.)
 */
async function uploadGLBFile(filePath) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', fs.createReadStream(filePath));

    const options = {
      method: 'POST',
      hostname: 'file.io',
      path: '/',
      headers: form.getHeaders()
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            resolve(response.link);
          } else {
            reject(new Error('File upload failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Create Tripo texturization task
 */
async function createTexturizationTask(modelUrl, prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: 'text_to_texture',
      original_model_url: modelUrl,
      text: prompt
    });

    const options = {
      method: 'POST',
      hostname: 'api.tripo3d.ai',
      path: '/v2/openapi/task',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.code === 0) {
            resolve(response.data.task_id);
          } else {
            reject(new Error(response.message || 'Task creation failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Poll task status
 */
async function pollTaskStatus(taskId) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'api.tripo3d.ai',
      path: `/v2/openapi/task/${taskId}`,
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.data);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Wait for task completion
 */
async function waitForCompletion(taskId) {
  const maxAttempts = 150; // 5 minutes max (150 * 2 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await pollTaskStatus(taskId);

    console.log(`⏳ Status: ${status.status} | Progress: ${status.progress}%`);

    if (status.status === 'SUCCESS') {
      const modelUrl = status.output?.model || status.result?.model?.url;
      if (!modelUrl) {
        throw new Error('Task succeeded but no model URL found');
      }
      return modelUrl;
    }

    if (status.status === 'FAILED' || status.status === 'CANCELLED') {
      throw new Error(`Task ${status.status.toLowerCase()}`);
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Task timeout');
}

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Upload GLB file
    console.log('📤 Step 1/4: Uploading GLB file...');
    const modelUrl = await uploadGLBFile(glbFilePath);
    console.log(`✅ File uploaded: ${modelUrl}`);
    console.log('');

    // Step 2: Create texturization task
    console.log('🚀 Step 2/4: Creating texturization task...');
    const taskId = await createTexturizationTask(modelUrl, texturePrompt);
    console.log(`✅ Task created: ${taskId}`);
    console.log('');

    // Step 3: Wait for completion
    console.log('⏳ Step 3/4: Processing (this may take 2-5 minutes)...');
    const texturedModelUrl = await waitForCompletion(taskId);
    console.log(`✅ Texturization complete!`);
    console.log(`🔗 Model URL: ${texturedModelUrl}`);
    console.log('');

    // Step 4: Download textured model
    console.log('💾 Step 4/4: Downloading textured model...');
    const originalName = path.basename(glbFilePath, '.glb');
    const outputPath = path.join(path.dirname(glbFilePath), `${originalName}-textured.glb`);
    await downloadFile(texturedModelUrl, outputPath);
    console.log(`✅ Downloaded to: ${outputPath}`);
    console.log('');

    console.log('🎉 SUCCESS! Your textured model is ready!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if form-data is installed
try {
  require.resolve('form-data');
} catch (e) {
  console.error('❌ Missing dependency: form-data');
  console.error('Please run: npm install form-data');
  process.exit(1);
}

main();
