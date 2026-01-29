# Social Publisher API

Bun-powered backend for publishing content to multiple social media platforms simultaneously:
- Facebook
- Instagram
- LinkedIn
- TikTok

## Features

✅ **Parallel Publishing** - Publish to all platforms at once
✅ **Multiple Content Types** - Text, images, and videos
✅ **File Uploads** - Direct file upload with form-data
✅ **Scheduled Posts** - Schedule posts for future publishing
✅ **API Key Authentication** - Secure endpoint protection
✅ **Error Handling** - Detailed error reporting per platform

## Quick Start

### Installation

```bash
cd apps/social-publisher
bun install
```

### Environment Setup

Create `.env` file with your social media credentials:

```env
# Facebook
FACEBOOK_PAGE_ACCESS_TOKEN=your_facebook_page_token
FACEBOOK_PAGE_ID=your_facebook_page_id

# Instagram (Meta)
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id

# LinkedIn
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_ORGANIZATION_ID=your_linkedin_organization_id

# TikTok
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
TIKTOK_BUSINESS_ACCOUNT_ID=your_tiktok_business_account_id

# Server
PORT=3001
SOCIAL_PUBLISHER_API_KEY=your_secure_api_key
```

### Development

```bash
# Watch mode
bun run dev

# Production
bun run start

# Build
bun run build

# Type check
bun run type-check
```

## API Endpoints

### 1. Publish Immediately

**Endpoint:** `POST /api/publish`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "platforms": ["facebook", "instagram", "linkedin", "tiktok"],
  "content": {
    "text": "🚀 Check out our new feature!",
    "media": [
      {
        "type": "image",
        "url": "https://example.com/image.jpg"
      }
    ],
    "hashtags": ["launch", "innovation"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "platform": "facebook",
      "success": true,
      "postId": "123456789"
    },
    {
      "platform": "instagram",
      "success": true,
      "postId": "987654321"
    },
    {
      "platform": "linkedin",
      "success": true,
      "postId": "post_id_123"
    },
    {
      "platform": "tiktok",
      "success": true,
      "postId": "video_id_123"
    }
  ],
  "totalTime": 2345
}
```

### 2. Publish with File Upload

**Endpoint:** `POST /api/publish/upload`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
```

**Form Fields:**
- `platforms` (string): Comma-separated platforms (facebook,instagram,linkedin,tiktok)
- `text` (string): Post content
- `hashtags` (string, optional): Comma-separated hashtags
- `scheduledFor` (ISO string, optional): Schedule time
- `media` (file, multiple): Image or video files

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/api/publish/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "platforms=facebook,instagram,linkedin" \
  -F "text=Beautiful sunset 🌅" \
  -F "hashtags=travel,nature,photography" \
  -F "media=@image1.jpg" \
  -F "media=@image2.jpg"
```

### 3. Get Scheduled Posts

**Endpoint:** `GET /api/scheduled`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "scheduled": [
    "1705353600000-abc123",
    "1705440000000-def456"
  ],
  "count": 2
}
```

### 4. Cancel Scheduled Post

**Endpoint:** `DELETE /api/scheduled/:postId`

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "postId": "1705353600000-abc123"
}
```

### 5. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

## Getting API Credentials

### Facebook & Instagram

1. Create Facebook App: https://developers.facebook.com/
2. Add Instagram Graph API product
3. Get Page Access Token from Settings > Basic
4. Get Page ID from your Facebook Page

### LinkedIn

1. Create app at https://www.linkedin.com/developers/
2. Request access to:
   - `ugcPost` (Create UGC posts)
   - `media:read` (Read media)
3. Generate personal access token (deprecated, use OAuth2)
4. Get Organization ID from admin panel

### TikTok

1. Create app at https://developer.tiktok.com/
2. Apply for TikTok Business API access
3. Get Business Account ID from TikTok For Business
4. Generate access token (requires OAuth2 flow)

## Integration with Angular

```typescript
// In your Angular component
import { SocialPublisherClient } from '@social-publisher/client';

export class SocialPublisherComponent {
  private client = new SocialPublisherClient(
    'http://localhost:3001',
    'your-api-key'
  );

  async publishPost() {
    try {
      const response = await this.client.publishWithFiles(
        ['facebook', 'instagram', 'linkedin', 'tiktok'],
        'Check out this amazing content! 🚀',
        this.selectedFiles,
        ['business', 'marketing']
      );

      console.log('Published successfully:', response);
    } catch (error) {
      console.error('Publish failed:', error);
    }
  }

  async schedulePost(scheduledTime: Date) {
    try {
      const response = await this.client.publishWithFiles(
        ['facebook', 'instagram'],
        'Scheduled post content',
        this.selectedFiles,
        undefined,
        scheduledTime
      );

      console.log('Post scheduled:', response);
    } catch (error) {
      console.error('Scheduling failed:', error);
    }
  }
}
```

## Error Handling

Each platform result includes error details:

```json
{
  "platform": "tiktok",
  "success": false,
  "error": "TikTok requires at least one video"
}
```

Common errors:
- **Invalid credentials** - Check API keys and permissions
- **Media upload failed** - Verify file format and size limits
- **Rate limiting** - Wait before retrying
- **Scheduling in past** - Ensure `scheduledFor` is in the future

## Performance

- **Publish Time**: 2-5 seconds for all platforms
- **Parallel execution**: All platforms publish simultaneously
- **File upload**: Supports up to 4 files per request
- **Video limits**: TikTok max 60 seconds, Instagram 60 seconds

## Security

- API Key required for all endpoints
- Use HTTPS in production
- Rotate API keys regularly
- Never commit credentials to git
- Use environment variables for sensitive data

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env
PORT=3002 bun run start
```

### API Key Not Working
- Verify `SOCIAL_PUBLISHER_API_KEY` in .env
- Check request headers: `Authorization: Bearer YOUR_KEY`

### Platform-Specific Issues

**Facebook/Instagram:**
- Verify page is in production (not development)
- Check if media meets Meta's requirements

**LinkedIn:**
- Ensure organization has proper permissions
- Check if personal access token is still valid

**TikTok:**
- Only videos supported (no images)
- Video must be MP4 format
- Check video duration limits

## Development

```bash
# Run tests
bun run test

# Type checking
bun run type-check

# Format code
bun fmt src/

# Lint (using Bun's built-in linter)
bun lint src/
```

## Architecture

```
src/
├── index.ts                 # Main Bun server
├── client.ts               # TypeScript client
├── types/
│   └── social-platforms.ts # Type definitions
└── services/
    ├── publisher.service.ts    # Orchestrator
    ├── meta.service.ts         # Facebook & Instagram
    ├── linkedin.service.ts     # LinkedIn
    └── tiktok.service.ts       # TikTok
```

## License

MIT
