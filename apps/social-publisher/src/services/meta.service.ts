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
  private readonly API_VERSION = 'v20.0';
  private readonly baseUrl = `https://graph.instagram.com/${this.API_VERSION}`;
  private readonly facebookBaseUrl = `https://graph.facebook.com/${this.API_VERSION}`;
  private config: MetaConfig;

  constructor(config: MetaConfig) {
    this.config = config;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.facebookBaseUrl}/me?access_token=${this.config.accessToken}`
      );
      return response.ok;
    } catch (error) {
      console.error('Meta credentials validation failed:', error);
      return false;
    }
  }

  async publishFacebook(content: SocialContent): Promise<PublishResult> {
    try {
      // Validate credentials first
      const isValid = await this.validateCredentials();
      if (!isValid) {
        throw new Error('Invalid Facebook credentials');
      }

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
        `${this.facebookBaseUrl}/${this.config.pageId}/feed`,
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

        // Fixed: Use pageId instead of /me/photos (deprecated endpoint)
        const uploadResponse = await fetch(
          `${this.facebookBaseUrl}/${this.config.pageId}/photos`,
          {
            method: 'POST',
            body: formData,
          }
        );

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
        // Instagram requires image_url as URL parameter, not FormData with blob
        const uploadResponse = await fetch(
          `${this.baseUrl}/${this.config.businessAccountId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              image_url: item.url,
              media_type: item.type === 'video' ? 'VIDEO' : 'IMAGE',
              access_token: this.config.accessToken,
            }).toString(),
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            `Instagram media upload failed: ${errorData.error?.message || uploadResponse.statusText}`
          );
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
          // Fixed: Use media_ids instead of children parameter
          media_ids: mediaIds.join(','),
          caption: caption,
          access_token: this.config.accessToken,
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Instagram carousel creation failed: ${errorData.error?.message || response.statusText}`
      );
    }

    const data: any = await response.json();
    return data.id;
  }
}
