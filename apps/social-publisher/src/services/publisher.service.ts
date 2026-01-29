// ============================================
// Publisher Service (Orchestrator)
// ============================================

import { MetaService } from './meta.service';
import { LinkedInService } from './linkedin.service';
import { TikTokService } from './tiktok.service';
import { SocialPlatform, PublishRequest, PublishResponse, SocialContent } from '../types/social-platforms';

interface PublisherConfig {
  facebook: {
    pageAccessToken: string;
    pageId: string;
  };
  instagram: {
    accessToken: string;
    businessAccountId: string;
  };
  linkedin: {
    accessToken: string;
    organizationId: string;
  };
  tiktok: {
    accessToken: string;
    businessAccountId: string;
  };
}

export class PublisherService {
  private metaService: MetaService;
  private linkedInService: LinkedInService;
  private tikTokService: TikTokService;
  private scheduledPosts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: PublisherConfig) {
    this.metaService = new MetaService({
      pageId: config.facebook.pageId,
      businessAccountId: config.instagram.businessAccountId,
      accessToken: config.facebook.pageAccessToken,
    });

    this.linkedInService = new LinkedInService({
      organizationId: config.linkedin.organizationId,
      accessToken: config.linkedin.accessToken,
    });

    this.tikTokService = new TikTokService({
      businessAccountId: config.tiktok.businessAccountId,
      accessToken: config.tiktok.accessToken,
    });
  }

  async publishToMultiplePlatforms(request: PublishRequest): Promise<PublishResponse> {
    const startTime = performance.now();
    const results = [];

    if (request.content.scheduledFor && request.content.scheduledFor > new Date()) {
      // Schedule for later
      return this.schedulePublish(request);
    }

    // Publish immediately to all platforms in parallel
    const promises = request.platforms.map((platform) =>
      this.publishToPlatform(platform, request.content)
    );

    const publishResults = await Promise.allSettled(promises);

    for (const result of publishResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          platform: 'unknown' as SocialPlatform,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    const endTime = performance.now();

    return {
      success: results.some((r) => r.success),
      results,
      totalTime: endTime - startTime,
    };
  }

  private async publishToPlatform(
    platform: SocialPlatform,
    content: SocialContent
  ): Promise<any> {
    console.log(`[${new Date().toISOString()}] Publishing to ${platform}...`);

    switch (platform) {
      case 'facebook':
        return this.metaService.publishFacebook(content);
      case 'instagram':
        return this.metaService.publishInstagram(content);
      case 'linkedin':
        return this.linkedInService.publish(content);
      case 'tiktok':
        return this.tikTokService.publish(content);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  private schedulePublish(request: PublishRequest): PublishResponse {
    const postId = this.generatePostId();
    const scheduledFor = request.content.scheduledFor!;
    const delayMs = scheduledFor.getTime() - new Date().getTime();

    const timeout = setTimeout(async () => {
      console.log(
        `[${new Date().toISOString()}] Publishing scheduled post ${postId}...`
      );

      const response = await this.publishToMultiplePlatforms({
        platforms: request.platforms,
        content: {
          ...request.content,
          scheduledFor: undefined, // Remove scheduled date
        },
      });

      console.log(`[${new Date().toISOString()}] Scheduled post ${postId} published:`, response);

      // Clean up
      this.scheduledPosts.delete(postId);
    }, delayMs);

    this.scheduledPosts.set(postId, timeout);

    return {
      success: true,
      results: request.platforms.map((platform) => ({
        platform,
        success: true,
        scheduledFor,
      })),
      totalTime: 0,
    };
  }

  private generatePostId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  getScheduledPosts() {
    return Array.from(this.scheduledPosts.keys());
  }

  cancelScheduledPost(postId: string): boolean {
    const timeout = this.scheduledPosts.get(postId);
    if (!timeout) return false;

    clearTimeout(timeout);
    this.scheduledPosts.delete(postId);
    return true;
  }
}
