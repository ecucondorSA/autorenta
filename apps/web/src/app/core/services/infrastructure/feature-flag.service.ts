import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  CreateFeatureFlagDto,
  CreateFeatureFlagOverrideDto,
  FeatureFlag,
  FeatureFlagAuditLog,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagOverride,
  UpdateFeatureFlagDto,
  UserSegment,
} from '@core/models';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('FeatureFlagService');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  // Local cache of feature flags
  private readonly flagsSignal = signal<Map<string, FeatureFlag>>(new Map());
  private readonly overridesSignal = signal<Map<string, FeatureFlagOverride>>(new Map());
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Computed values
  readonly flags = computed(() => Array.from(this.flagsSignal().values()));
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // User context for evaluation
  private contextSignal = signal<FeatureFlagContext>({});

  // Realtime subscription
  private realtimeChannel: RealtimeChannel | null = null;

  // Cache TTL (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private lastFetch: number = 0;

  constructor() {
    this.initialize();

    // Cleanup realtime subscription on destroy
    this.destroyRef.onDestroy(() => {
      if (this.realtimeChannel) {
        this.supabase.removeChannel(this.realtimeChannel);
      }
    });
  }

  /**
   * Initialize the service and subscribe to realtime updates
   */
  private async initialize(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadFlags();
      this.subscribeToRealtime();
    }
  }

  /**
   * Load all feature flags from database
   */
  async loadFlags(): Promise<void> {
    // Skip if cache is still valid
    if (Date.now() - this.lastFetch < this.CACHE_TTL && this.flagsSignal().size > 0) {
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase.from('feature_flags').select('*').order('name');

      if (error) throw error;

      const flagsMap = new Map<string, FeatureFlag>();
      (data || []).forEach((flag) => flagsMap.set(flag.name, flag));
      this.flagsSignal.set(flagsMap);
      this.lastFetch = Date.now();

      this.logger.debug('Feature flags loaded', { count: flagsMap.size });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feature flags';
      this.errorSignal.set(message);
      this.logger.error('Failed to load feature flags', { error: err });
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load user-specific overrides
   */
  async loadOverrides(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('feature_flag_overrides')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const overridesMap = new Map<string, FeatureFlagOverride>();
      (data || []).forEach((override) => overridesMap.set(override.feature_flag_id, override));
      this.overridesSignal.set(overridesMap);

      this.logger.debug('Feature flag overrides loaded', { count: overridesMap.size });
    } catch (err) {
      this.logger.error('Failed to load feature flag overrides', { error: err });
    }
  }

  /**
   * Subscribe to realtime updates for feature flags
   */
  private subscribeToRealtime(): void {
    this.realtimeChannel = this.supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
        },
        (payload) => {
          this.handleRealtimeUpdate({
            eventType: payload.eventType,
            new: payload.new as FeatureFlag | null,
            old: payload.old as { id: string; name?: string } | null,
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.logger.debug('Feature flags realtime subscription active');
        }
      });
  }

  /**
   * Handle realtime updates
   */
  private handleRealtimeUpdate(payload: {
    eventType: string;
    new: FeatureFlag | null;
    old: { id: string; name?: string } | null;
  }): void {
    const currentFlags = new Map(this.flagsSignal());

    switch (payload.eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (payload.new) {
          currentFlags.set(payload.new.name, payload.new);
          this.logger.info('Feature flag updated via realtime', { name: payload.new.name });
        }
        break;
      case 'DELETE':
        if (payload.old?.name) {
          currentFlags.delete(payload.old.name);
          this.logger.info('Feature flag deleted via realtime', { name: payload.old.name });
        }
        break;
    }

    this.flagsSignal.set(currentFlags);
  }

  /**
   * Set user context for flag evaluation
   */
  setContext(context: FeatureFlagContext): void {
    this.contextSignal.set(context);
    if (context.userId) {
      this.loadOverrides(context.userId);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: string): boolean {
    return this.evaluate(flagName).enabled;
  }

  /**
   * Get a signal that tracks if a feature flag is enabled
   */
  isEnabledSignal(flagName: string) {
    return computed(() => this.evaluate(flagName).enabled);
  }

  /**
   * Evaluate a feature flag with full details
   */
  evaluate(flagName: string): FeatureFlagEvaluation {
    const flag = this.flagsSignal().get(flagName);
    const context = this.contextSignal();

    // Flag not found
    if (!flag) {
      return {
        flagName,
        enabled: false,
        reason: 'flag_not_found',
      };
    }

    // Flag globally disabled
    if (!flag.enabled) {
      return {
        flagName,
        enabled: false,
        reason: 'flag_disabled',
      };
    }

    // Check user override
    if (context.userId) {
      const override = this.overridesSignal().get(flag.id);
      if (override) {
        return {
          flagName,
          enabled: override.enabled,
          reason: 'user_override',
        };
      }
    }

    // Check user segments
    if (flag.user_segments && flag.user_segments.length > 0) {
      const segmentMatch = this.evaluateSegments(flag.user_segments, context);
      if (segmentMatch !== null) {
        return {
          flagName,
          enabled: segmentMatch,
          reason: 'segment_match',
        };
      }
    }

    // Check rollout percentage
    if (flag.rollout_percentage < 100 && context.userId) {
      const inRollout = this.isInRollout(flag.name, context.userId, flag.rollout_percentage);
      return {
        flagName,
        enabled: inRollout,
        reason: 'rollout_percentage',
      };
    }

    // Default: flag is enabled
    return {
      flagName,
      enabled: true,
      reason: 'default_enabled',
    };
  }

  /**
   * Evaluate user segments
   */
  private evaluateSegments(segments: UserSegment[], context: FeatureFlagContext): boolean | null {
    for (const segment of segments) {
      const match = this.evaluateSegment(segment, context);
      if (match) return true;
    }
    return null; // No segment matched, fall through to other rules
  }

  /**
   * Evaluate a single segment
   */
  private evaluateSegment(segment: UserSegment, context: FeatureFlagContext): boolean {
    switch (segment.type) {
      case 'user_id':
        return Array.isArray(segment.value)
          ? segment.value.includes(context.userId || '')
          : segment.value === context.userId;

      case 'email_domain': {
        if (!context.email) return false;
        const domain = context.email.split('@')[1];
        return Array.isArray(segment.value)
          ? segment.value.includes(domain)
          : segment.value === domain;
      }

      case 'role':
        return Array.isArray(segment.value)
          ? segment.value.includes(context.role || '')
          : segment.value === context.role;

      case 'is_owner':
        return context.isOwner === true;

      case 'is_renter':
        return context.isRenter === true;

      case 'has_completed_booking':
        return context.hasCompletedBooking === true;

      case 'country':
        return Array.isArray(segment.value)
          ? segment.value.includes(context.country || '')
          : segment.value === context.country;

      case 'city':
        return Array.isArray(segment.value)
          ? segment.value.includes(context.city || '')
          : segment.value === context.city;

      default:
        return false;
    }
  }

  /**
   * Determine if a user is in the rollout percentage
   * Uses consistent hashing so the same user always gets the same result
   */
  private isInRollout(flagName: string, userId: string, percentage: number): boolean {
    const hash = this.hashString(`${flagName}:${userId}`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  /**
   * Simple string hash function for consistent rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // ============== Admin Methods ==============

  /**
   * Get all feature flags (admin)
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await this.supabase.from('feature_flags').select('*').order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new feature flag (admin)
   */
  async createFlag(dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    const { data, error } = await this.supabase.from('feature_flags').insert(dto).select().single();

    if (error) throw error;

    // Update local cache
    const currentFlags = new Map(this.flagsSignal());
    currentFlags.set(data.name, data);
    this.flagsSignal.set(currentFlags);

    this.logger.info('Feature flag created', { name: data.name });
    return data;
  }

  /**
   * Update a feature flag (admin)
   */
  async updateFlag(id: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlag> {
    const { data, error } = await this.supabase
      .from('feature_flags')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update local cache
    const currentFlags = new Map(this.flagsSignal());
    currentFlags.set(data.name, data);
    this.flagsSignal.set(currentFlags);

    this.logger.info('Feature flag updated', { name: data.name });
    return data;
  }

  /**
   * Delete a feature flag (admin)
   */
  async deleteFlag(id: string): Promise<void> {
    // Get flag name first for cache update
    const flag = Array.from(this.flagsSignal().values()).find((f) => f.id === id);

    const { error } = await this.supabase.from('feature_flags').delete().eq('id', id);

    if (error) throw error;

    // Update local cache
    if (flag) {
      const currentFlags = new Map(this.flagsSignal());
      currentFlags.delete(flag.name);
      this.flagsSignal.set(currentFlags);
    }

    this.logger.info('Feature flag deleted', { id });
  }

  /**
   * Toggle a feature flag (admin)
   */
  async toggleFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
    return this.updateFlag(id, { enabled });
  }

  /**
   * Create a user override (admin)
   */
  async createOverride(dto: CreateFeatureFlagOverrideDto): Promise<FeatureFlagOverride> {
    const { data, error } = await this.supabase
      .from('feature_flag_overrides')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;

    this.logger.info('Feature flag override created', {
      flagId: dto.feature_flag_id,
      userId: dto.user_id,
    });
    return data;
  }

  /**
   * Delete a user override (admin)
   */
  async deleteOverride(id: string): Promise<void> {
    const { error } = await this.supabase.from('feature_flag_overrides').delete().eq('id', id);

    if (error) throw error;

    this.logger.info('Feature flag override deleted', { id });
  }

  /**
   * Get audit log (admin)
   */
  async getAuditLog(limit = 100): Promise<FeatureFlagAuditLog[]> {
    const { data, error } = await this.supabase
      .from('feature_flag_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

}
