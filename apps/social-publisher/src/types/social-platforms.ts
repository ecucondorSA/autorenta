// ============================================
// Social Media Platform Types
// ============================================

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface SocialContent {
  text: string;
  media?: MediaItem[];
  hashtags?: string[];
  scheduledFor?: Date; // null = publish immediately
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  localPath?: string;
  mimeType?: string;
}

export interface PublishRequest {
  platforms: SocialPlatform[];
  content: SocialContent;
}

export interface PublishResponse {
  success: boolean;
  results: PublishResult[];
  totalTime: number;
}

export interface PublishResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  error?: string;
  scheduledFor?: Date;
}

// Platform-specific credentials
export interface SocialCredentials {
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

// Webhook responses
export interface FacebookResponse {
  id: string;
  created_time?: string;
}

export interface LinkedInResponse {
  id: string;
}

export interface TikTokResponse {
  data?: {
    video_id?: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

// Upload responses
export interface UploadResponse {
  mediaId: string;
  url: string;
}
