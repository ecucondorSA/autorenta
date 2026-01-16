// ============================================
// LinkedIn Service
// ============================================

import { SocialContent, PublishResult } from '../types/social-platforms';

interface LinkedInConfig {
  organizationId: string;
  accessToken: string;
}

export class LinkedInService {
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private config: LinkedInConfig;

  constructor(config: LinkedInConfig) {
    this.config = config;
  }

  async publish(content: SocialContent): Promise<PublishResult> {
    try {
      let postData: Record<string, any> = {
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          article: {
            title: content.text.substring(0, 100),
            description: content.text.substring(0, 256),
          },
        },
        owner: `urn:li:organization:${this.config.organizationId}`,
        text: {
          text: this.formatLinkedInText(content.text, content.hashtags),
        },
      };

      // Add media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMedia(content.media);
        if (mediaIds.length > 0) {
          postData.content.media = {
            media: mediaIds.map((id) => ({
              media: id,
            })),
          };
        }
      }

      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `LinkedIn API Error: ${error.message || response.statusText}`
        );
      }

      const data: any = await response.json();

      return {
        platform: 'linkedin',
        success: true,
        postId: data.id,
      };
    } catch (error) {
      console.error('LinkedIn publish error:', error);
      return {
        platform: 'linkedin',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async uploadMedia(media: any[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      try {
        // Get presigned URL
        const initResponse = await fetch(
          `${this.baseUrl}/assets?action=getSignedUrl`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: ['PRIMARY_PHOTO'],
                owner: `urn:li:organization:${this.config.organizationId}`,
                serviceRelationships: [
                  {
                    relationshipType: 'OWNER',
                    identifier: `urn:li:organization:${this.config.organizationId}`,
                  },
                ],
              },
            }),
          }
        );

        if (!initResponse.ok) {
          throw new Error('Failed to get presigned URL');
        }

        const initData: any = await initResponse.json();
        const uploadUrl = initData.value.uploadMechanism['com.linkedin.digitalmedia_uploadmechanism#staticUploadUrl'].uploadUrl;
        const assetId = initData.value.asset;

        // Upload media
        const blob = await fetch(item.url).then((r) => r.blob());
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': item.mimeType || 'image/jpeg',
          },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media');
        }

        mediaIds.push(assetId);
      } catch (error) {
        console.error('LinkedIn media upload error:', error);
      }
    }

    return mediaIds;
  }

  private formatLinkedInText(text: string, hashtags?: string[]): string {
    let formatted = text;

    if (hashtags && hashtags.length > 0) {
      formatted += '\n\n' + hashtags.map((tag) => `#${tag}`).join(' ');
    }

    return formatted;
  }
}
