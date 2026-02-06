// ============================================
// TikTok Service
// ============================================

import { SocialContent, PublishResult } from '../types/social-platforms';

interface TikTokConfig {
  businessAccountId: string;
  accessToken: string;
  clientKey?: string;
  clientSecret?: string;
}

export class TikTokService {
  private readonly baseUrl = 'https://open.tiktokapis.com/v2';
  private config: TikTokConfig;

  constructor(config: TikTokConfig) {
    this.config = config;
  }

  async publish(content: SocialContent): Promise<PublishResult> {
    try {
      // TikTok requires video content
      const videoMedia = content.media?.find((m) => m.type === 'video');
      if (!videoMedia) {
        throw new Error('TikTok requires at least one video');
      }

      const videoUrl = videoMedia.url;
      if (!videoUrl) {
        throw new Error('TikTok video URL is required');
      }

      const publishResponse = await this.publishVideoFromUrl(videoUrl, content.text);

      return {
        platform: 'tiktok',
        success: true,
        postId: publishResponse.publish_id || publishResponse.video_id,
      };
    } catch (error) {
      console.error('TikTok publish error:', error);
      return {
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishVideoFromUrl(videoUrl: string, caption: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `TikTok API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data: any = await response.json();
    return data.data || data;
  }
}
