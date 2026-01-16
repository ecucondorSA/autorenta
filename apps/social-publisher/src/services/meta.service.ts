// ============================================
// Meta (Facebook & Instagram) Service
// ============================================

import { SocialContent, PublishResult, UploadResponse } from '../types/social-platforms';

interface MetaConfig {
  pageId: string;
  businessAccountId: string;
  accessToken: string;
}

export class MetaService {
  private readonly baseUrl = 'https://graph.instagram.com/v19.0';
  private config: MetaConfig;

  constructor(config: MetaConfig) {
    this.config = config;
  }

  async publishFacebook(content: SocialContent): Promise<PublishResult> {
    const startTime = performance.now();

    try {
      let postData: Record<string, any> = {
        message: content.text,
        access_token: this.config.accessToken,
      };

      // Upload media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFacebook(content.media);
        if (mediaIds.length === 1) {
          postData.picture = mediaIds[0]; // Single image
        } else if (mediaIds.length > 1) {
          postData.multi_share_optimized_content = mediaIds.map((id) => ({
            picture: id,
          }));
        }
      }

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${this.config.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(postData).toString(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || response.statusText}`);
      }

      const data: any = await response.json();

      return {
        platform: 'facebook',
        success: true,
        postId: data.id,
      };
    } catch (error) {
      console.error('Facebook publish error:', error);
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishInstagram(content: SocialContent): Promise<PublishResult> {
    try {
      // Instagram requires media to be uploaded first
      if (!content.media || content.media.length === 0) {
        throw new Error('Instagram requires at least one media item');
      }

      const mediaIds = await this.uploadMediaInstagram(content.media);

      // Create carousel for multiple items
      let postId: string;

      if (mediaIds.length === 1) {
        postId = await this.createInstagramSinglePost(mediaIds[0], content.text);
      } else {
        postId = await this.createInstagramCarouselPost(mediaIds, content.text);
      }

      return {
        platform: 'instagram',
        success: true,
        postId,
      };
    } catch (error) {
      console.error('Instagram publish error:', error);
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async uploadMediaFacebook(media: any[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      try {
        const formData = new FormData();
        const response = await fetch(item.url);
        const blob = await response.blob();
        formData.append('source', blob, `media.${item.type}`);
        formData.append('access_token', this.config.accessToken);

        const uploadResponse = await fetch(`https://graph.facebook.com/v19.0/me/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload to Facebook');
        }

        const data: any = await uploadResponse.json();
        mediaIds.push(data.id);
      } catch (error) {
        console.error('Facebook media upload error:', error);
      }
    }

    return mediaIds;
  }

  private async uploadMediaInstagram(media: any[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      try {
        const formData = new FormData();
        const response = await fetch(item.url);
        const blob = await response.blob();
        formData.append('image_url', item.url);
        formData.append('media_type', item.type === 'video' ? 'VIDEO' : 'IMAGE');
        formData.append('access_token', this.config.accessToken);

        const uploadResponse = await fetch(
          `${this.baseUrl}/${this.config.businessAccountId}/media`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload to Instagram');
        }

        const data: any = await uploadResponse.json();
        mediaIds.push(data.id);
      } catch (error) {
        console.error('Instagram media upload error:', error);
      }
    }

    return mediaIds;
  }

  private async createInstagramSinglePost(mediaId: string, caption: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${mediaId}/captions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        caption: caption,
        access_token: this.config.accessToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to create Instagram caption');
    }

    const data: any = await response.json();
    return data.id;
  }

  private async createInstagramCarouselPost(
    mediaIds: string[],
    caption: string
  ): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/${this.config.businessAccountId}/media_carousel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          media_type: 'CAROUSEL',
          children: mediaIds.join(','),
          caption: caption,
          access_token: this.config.accessToken,
        }).toString(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create Instagram carousel');
    }

    const data: any = await response.json();
    return data.id;
  }
}
