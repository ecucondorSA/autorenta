// ============================================
// Social Publisher Client
// Usage example for consuming the API
// ============================================

import type { PublishRequest, PublishResponse } from './types/social-platforms';

export class SocialPublisherClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl = 'http://localhost:3001', apiKey = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getAuthHeader(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Publish content to multiple platforms immediately
   */
  async publishNow(request: PublishRequest): Promise<PublishResponse> {
    const response = await fetch(`${this.baseUrl}/api/publish`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Publish with file upload support
   */
  async publishWithFiles(
    platforms: string[],
    text: string,
    files: File[],
    hashtags?: string[],
    scheduledFor?: Date
  ): Promise<PublishResponse> {
    const formData = new FormData();
    formData.append('platforms', platforms.join(','));
    formData.append('text', text);
    if (hashtags?.length) {
      formData.append('hashtags', hashtags.join(','));
    }
    if (scheduledFor) {
      formData.append('scheduledFor', scheduledFor.toISOString());
    }

    files.forEach((file, index) => {
      formData.append(`media`, file);
    });

    const response = await fetch(`${this.baseUrl}/api/publish/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of scheduled posts
   */
  async getScheduledPosts(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/scheduled`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.scheduled;
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/scheduled/${postId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.success;
  }
}

// ============================================
// Example Usage
// ============================================

/*
import { SocialPublisherClient } from './client';

const client = new SocialPublisherClient('http://localhost:3001', 'your-api-key');

// Example 1: Publish text to all platforms
await client.publishNow({
  platforms: ['facebook', 'instagram', 'linkedin', 'tiktok'],
  content: {
    text: '🚀 Check out our new feature!',
    hashtags: ['launch', 'innovation', 'tech']
  }
});

// Example 2: Publish with images (immediate)
const files = [
  new File(['...'], 'image1.jpg', { type: 'image/jpeg' }),
  new File(['...'], 'image2.jpg', { type: 'image/jpeg' })
];

await client.publishWithFiles(
  ['facebook', 'instagram', 'linkedin'],
  'Beautiful sunset photos 🌅',
  files,
  ['travel', 'nature', 'photography']
);

// Example 3: Schedule for later
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);

await client.publishWithFiles(
  ['facebook', 'instagram', 'tiktok'],
  'This post will be published tomorrow at 10 AM',
  [],
  undefined,
  tomorrow
);

// Example 4: Get scheduled posts
const scheduled = await client.getScheduledPosts();
console.log('Scheduled posts:', scheduled);

// Example 5: Cancel scheduled post
await client.cancelScheduledPost(scheduled[0]);
*/
