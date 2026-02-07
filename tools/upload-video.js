
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function upload() {
  const jobId = process.env.JOB_ID || `manual-${Date.now()}`;
  const videoPath = path.join(__dirname, '../apps/video-studio/out/video.mp4');
  
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found at: ${videoPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(videoPath);
  const fileName = `marketing/videos/${jobId}.mp4`;
  const bucketName = process.env.MARKETING_BUCKET || 'marketing-media';

  console.log(`Checking if bucket '${bucketName}' exists...`);
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);

  if (bucketError && bucketError.message.includes('not found')) {
      console.log(`Bucket '${bucketName}' not found. Creating it...`);
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['video/mp4', 'image/png', 'image/jpeg', 'image/webp']
      });
      
      if (createError) {
          console.error('Failed to create bucket:', createError);
          // Try to continue anyway, maybe race condition or permission issue that allows upload but not create
      } else {
          console.log(`Bucket '${bucketName}' created successfully.`);
      }
  } else if (bucketError) {
      console.warn('Error checking bucket:', bucketError);
  }

  console.log(`Uploading ${videoPath} to ${bucketName}/${fileName}...`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true
    });

  if (error) {
    console.error('Upload error:', error);
    process.exit(1);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  const publicUrl = publicUrlData.publicUrl;
  console.log('Upload success! Public URL:', publicUrl);

  // Write URL to a file so GitHub Actions can read it easily
  fs.writeFileSync('video_url.txt', publicUrl);
}

upload().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
