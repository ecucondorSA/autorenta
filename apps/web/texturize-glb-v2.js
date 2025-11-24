#!/usr/bin/env node

/**
 * Script to apply AI-generated textures to GLB models using Tripo API
 * This version uses a more reliable upload method
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const TRIPO_API_KEY = process.env.TRIPO_API_KEY || 'tsk_1kPSiPNNEeD79J8iKnIDLPEotzXLqLqe';
const TRIPO_API_URL = 'https://api.tripo3d.ai/v2/openapi';

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node texturize-glb-v2.js <glb-file-path> <texture-prompt>');
  process.exit(1);
}

const glbFilePath = args[0];
const texturePrompt = args[1];

if (!fs.existsSync(glbFilePath)) {
  console.error(`Error: File not found: ${glbFilePath}`);
  process.exit(1);
}

console.log(`🎨 Starting texturization process...`);
console.log(`📁 Model file: ${glbFilePath}`);
console.log(`💬 Texture prompt: "${texturePrompt}"`);
console.log('');

/**
 * Step 1: Upload the GLB file to Tripo's storage
 */
async function uploadToTripo(filePath) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', fs.createReadStream(filePath));

    const options = {
      method: 'POST',
      hostname: 'api.tripo3d.ai',
      path: '/v2/openapi/upload',
      headers: {
        ...form.getHeaders(),
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
          if (response.code === 0 && response.data?.image_token) {
            resolve(response.data.image_token);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse upload response: ' + data));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Create texturization task using uploaded file token
 */
async function createTexturizationTask(fileToken, prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: 'stylize_model',
      model_token: fileToken,
      style_prompt: prompt
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
            reject(new Error(response.message || 'Task creation failed: ' + data));
          }
        } catch (error) {
          reject(new Error('Failed to parse task response: ' + data));
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
 * Wait for completion
 */
async function waitForCompletion(taskId) {
  const maxAttempts = 150;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await pollTaskStatus(taskId);

    console.log(`⏳ Status: ${status.status} | Progress: ${status.progress || 0}%`);

    if (status.status === 'success') {
      const modelUrl = status.output?.model || status.result?.model?.url || status.output?.rendered_image;
      if (!modelUrl) {
        console.log('Full response:', JSON.stringify(status, null, 2));
        throw new Error('Task succeeded but no model URL found');
      }
      return modelUrl;
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`Task ${status.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;
  }

  throw new Error('Task timeout');
}

/**
 * Download file
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
 * Main
 */
async function main() {
  try {
    console.log('📤 Step 1/4: Uploading GLB to Tripo...');
    const fileToken = await uploadToTripo(glbFilePath);
    console.log(`✅ File uploaded, token: ${fileToken}`);
    console.log('');

    console.log('🚀 Step 2/4: Creating texturization task...');
    const taskId = await createTexturizationTask(fileToken, texturePrompt);
    console.log(`✅ Task created: ${taskId}`);
    console.log('');

    console.log('⏳ Step 3/4: Processing...');
    const texturedModelUrl = await waitForCompletion(taskId);
    console.log(`✅ Complete!`);
    console.log(`🔗 URL: ${texturedModelUrl}`);
    console.log('');

    console.log('💾 Step 4/4: Downloading...');
    const originalName = path.basename(glbFilePath, '.glb');
    const outputPath = path.join(path.dirname(glbFilePath), `${originalName}-textured.glb`);
    await downloadFile(texturedModelUrl, outputPath);
    console.log(`✅ Saved to: ${outputPath}`);
    console.log('');

    console.log('🎉 SUCCESS!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
