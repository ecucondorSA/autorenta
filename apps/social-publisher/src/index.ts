// ============================================
// Bun Social Publisher Server
// ============================================

import { PublisherService } from './services/publisher.service';
import type { PublishRequest, PublishResponse } from './types/social-platforms';

// Load environment variables
const config = {
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.FACEBOOK_PAGE_ID || '',
  },
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
  },
  linkedin: {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    organizationId: process.env.LINKEDIN_ORGANIZATION_ID || '',
  },
  tiktok: {
    accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
    businessAccountId: process.env.TIKTOK_BUSINESS_ACCOUNT_ID || '',
  },
};

const publisher = new PublisherService(config);
const PORT = parseInt(process.env.PORT || '3001');
const API_KEY = process.env.SOCIAL_PUBLISHER_API_KEY || 'dev-key';

// ============================================
// Middleware
// ============================================

function validateApiKey(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  return authHeader === `Bearer ${API_KEY}`;
}

async function parseMultipartForm(req: Request): Promise<FormData> {
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    throw new Error('Invalid content type');
  }
  return req.formData();
}

// ============================================
// Error Handler
// ============================================

function errorResponse(error: any, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================
// Routes
// ============================================

const routes = {
  // Health check
  'GET /health': () => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Publish to multiple platforms
  'POST /api/publish': async (req: Request) => {
    try {
      if (!validateApiKey(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const publishRequest: PublishRequest = body;

      // Validate request
      if (!publishRequest.platforms || publishRequest.platforms.length === 0) {
        throw new Error('At least one platform must be specified');
      }

      if (!publishRequest.content || !publishRequest.content.text) {
        throw new Error('Content text is required');
      }

      console.log(
        `[${new Date().toISOString()}] Publishing to ${publishRequest.platforms.join(', ')}...`
      );

      const response = await publisher.publishToMultiplePlatforms(publishRequest);

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },

  // Publish with file upload
  'POST /api/publish/upload': async (req: Request) => {
    try {
      if (!validateApiKey(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const formData = await parseMultipartForm(req);

      // Extract form fields
      const platforms = (formData.get('platforms') as string)?.split(',') || [];
      const text = formData.get('text') as string;
      const scheduledFor = formData.get('scheduledFor') as string | null;
      const hashtags = (formData.get('hashtags') as string)?.split(',') || [];

      // Extract media files
      const media = [];
      const entries = formData.entries();
      for (const [key, value] of entries) {
        if (key.startsWith('media')) {
          const file = value as File;
          const buffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          media.push({
            type: file.type.startsWith('video') ? 'video' : 'image',
            url: `data:${file.type};base64,${base64}`,
            mimeType: file.type,
          });
        }
      }

      const publishRequest: PublishRequest = {
        platforms: platforms as any[],
        content: {
          text,
          media,
          hashtags,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        },
      };

      console.log(
        `[${new Date().toISOString()}] Publishing with upload to ${platforms.join(', ')}...`
      );

      const response = await publisher.publishToMultiplePlatforms(publishRequest);

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },

  // Get scheduled posts
  'GET /api/scheduled': (req: Request) => {
    try {
      if (!validateApiKey(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const scheduled = publisher.getScheduledPosts();
      return new Response(JSON.stringify({ scheduled, count: scheduled.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },

  // Cancel scheduled post
  'DELETE /api/scheduled/:postId': (req: Request, { postId }: { postId: string }) => {
    try {
      if (!validateApiKey(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const success = publisher.cancelScheduledPost(postId);
      return new Response(JSON.stringify({ success, postId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};

// ============================================
// Router
// ============================================

const router = new Bun.Router();

// Register routes
router.get('/health', routes['GET /health']);
router.post('/api/publish', routes['POST /api/publish']);
router.post('/api/publish/upload', routes['POST /api/publish/upload']);
router.get('/api/scheduled', routes['GET /api/scheduled']);
router.delete('/api/scheduled/:postId', routes['DELETE /api/scheduled/:postId']);

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ============================================
// Server
// ============================================

export default {
  port: PORT,
  hostname: '0.0.0.0',
  fetch(request: Request) {
    return router.route(request) || new Response('Not found', { status: 404 });
  },
};

console.log(`\n🚀 Social Publisher Server running on http://localhost:${PORT}`);
console.log(`📝 Publish endpoint: POST /api/publish`);
console.log(`📤 Upload endpoint: POST /api/publish/upload`);
console.log(`📅 Scheduled posts: GET /api/scheduled`);
console.log(`❌ Cancel scheduled: DELETE /api/scheduled/:postId\n`);
