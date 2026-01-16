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
  private readonly baseUrl = 'https://open.tiktokapis.com/v1';
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
      const videoData = await this.downloadVideo(videoUrl);

      // Initialize upload
      const uploadResponse = await this.initializeUpload(content);

      // Upload video
      await this.uploadVideo(uploadResponse.uploadUrl, videoData);

      // Publish video
      const publishResponse = await this.publishVideo(
        uploadResponse.uploadToken,
        content.text
      );

      return {
        platform: 'tiktok',
        success: true,
        postId: publishResponse.video_id,
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

  private async initializeUpload(content: SocialContent): Promise<any> {
    const response = await fetch(`${this.baseUrl}/video/upload/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_info: {
          source: 'SCHEDULE_VIDEO',
          privacy_level: 0, // Public
        },
        upload_type: 'UPLOAD_BY_FILE',
        video_capture_mode: 'SELF_SHOOT',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize TikTok upload');
    }

    const data: any = await response.json();
    return {
      uploadUrl: data.data.upload_url,
      uploadToken: data.data.upload_token,
    };
  }

  private async uploadVideo(uploadUrl: string, videoData: Buffer): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: videoData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload video to TikTok');
    }
  }

  private async publishVideo(uploadToken: string, caption: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/video/publish/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          upload_token: uploadToken,
          video_cover_timestamp_ms: 0,
          title: caption.substring(0, 150),
          video_description: caption,
          visibility_type: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `TikTok API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data: any = await response.json();
    return {
      video_id: data.data.video_id,
    };
  }

  private async downloadVideo(url: string): Promise<Buffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to download video');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
