import { Injectable, inject, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { environment } from '@environment';
import { ProfileStore } from '@core/stores/profile.store';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';

/**
 * Onboarding MVP Service
 *
 * Manages the simplified onboarding flow for new users.
 *
 * Features:
 * - Initial goal selection (publish, rent, both)
 * - Hardcoded checklist for locador and locatario
 * - Progress tracking with analytics
 * - Navigation helpers
 */

export type PrimaryGoal = 'publish' | 'rent' | 'both' | null;

export interface OnboardingStep {
  key: string;
  title: string;
  completed: boolean;
  action: string; // Route to navigate
}

export interface OnboardingStatusState {
  userId: string;
  role: string | null;
  primaryGoal: PrimaryGoal;
  showInitialModal: boolean;
  onboardingStatus: string | null;
  locadorSteps: OnboardingStep[];
  locatarioSteps: OnboardingStep[];
  activeChecklist: 'locador' | 'locatario' | 'both' | null;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly profileStore = inject(ProfileStore);
  private readonly supabase: SupabaseClient;

  // State
  readonly onboardingStatus = signal<OnboardingStatusState | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed
  readonly showInitialModal = computed(() => this.onboardingStatus()?.showInitialModal ?? false);
  readonly primaryGoal = computed(() => this.onboardingStatus()?.primaryGoal ?? null);
  readonly locadorSteps = computed(() => this.onboardingStatus()?.locadorSteps ?? []);
  readonly locatarioSteps = computed(() => this.onboardingStatus()?.locatarioSteps ?? []);
  readonly activeChecklist = computed(() => this.onboardingStatus()?.activeChecklist ?? null);

  // Progress computed
  readonly locadorProgress = computed(() => {
    const steps = this.locadorSteps();
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.completed).length;
    return Math.round((completed / steps.length) * 100);
  });

  readonly locatarioProgress = computed(() => {
    const steps = this.locatarioSteps();
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.completed).length;
    return Math.round((completed / steps.length) * 100);
  });

  readonly isOnboardingComplete = computed(() => {
    const checklist = this.activeChecklist();
    if (!checklist) return true;

    if (checklist === 'both') {
      return this.locadorProgress() === 100 && this.locatarioProgress() === 100;
    }

    if (checklist === 'locador') {
      return this.locadorProgress() === 100;
    }

    if (checklist === 'locatario') {
      return this.locatarioProgress() === 100;
    }

    return false;
  });

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  /**
   * Load onboarding status from database
   */
  async loadOnboardingStatus(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.rpc('get_onboarding_status');

      if (error) {
        console.error('Error loading onboarding status:', error);
        this.error.set(error.message);
        return;
      }

      if (data) {
        this.onboardingStatus.set(data as OnboardingStatusState);

        // Track analytics
        if (data.showInitialModal) {
          this.analytics.trackEvent('onboarding_modal_shown', {
            userId: data.userId,
          });
        }
      }
    } catch (err) {
      console.error('Error loading onboarding status:', err);
      this.error.set('Error cargando estado de onboarding');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set primary goal and redirect
   */
  async setPrimaryGoal(goal: 'publish' | 'rent' | 'both'): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.rpc('set_primary_goal', {
        p_goal: goal,
      });

      if (error) {
        console.error('Error setting primary goal:', error);
        this.error.set(error.message);
        return;
      }

      if (data && data.success) {
        // Track analytics
        this.analytics.trackEvent('onboarding_goal_selected', {
          goal,
          timestamp: new Date().toISOString(),
        });

        // Reload onboarding status
        await this.loadOnboardingStatus();

        // Navigate based on goal
        this.navigateToFirstStep(goal);
      } else {
        this.error.set(data?.error || 'Error guardando objetivo');
      }
    } catch (err) {
      console.error('Error setting primary goal:', err);
      this.error.set('Error guardando objetivo');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Navigate to first step based on goal
   */
  private navigateToFirstStep(goal: 'publish' | 'rent' | 'both'): void {
    // Check if profile is complete first
    const profile = this.profileStore.profile();
    const hasBasicProfile = profile?.full_name && profile?.phone;

    if (!hasBasicProfile) {
      this.router.navigate(['/profile']);
      return;
    }

    // Navigate based on goal
    switch (goal) {
      case 'publish':
        this.router.navigate(['/cars/publish']);
        break;
      case 'rent':
        this.router.navigate(['/cars/list']);
        break;
      case 'both':
        // Fall back to the marketplace landing where both experiences converge
        this.router.navigate(['/']);
        break;
    }
  }

  /**
   * Get next pending step for a checklist
   */
  getNextStep(checklist: 'locador' | 'locatario'): OnboardingStep | null {
    const steps = checklist === 'locador' ? this.locadorSteps() : this.locatarioSteps();
    return steps.find((s) => !s.completed) || null;
  }

  /**
   * Navigate to a step's action
   */
  navigateToStep(step: OnboardingStep): void {
    this.analytics.trackEvent('onboarding_step_clicked', {
      step: step.key,
      title: step.title,
      route: step.action,
    });

    this.router.navigateByUrl(step.action);
  }

  /**
   * Track step completion (called from components)
   */
  trackStepCompletion(stepKey: string): void {
    this.analytics.trackEvent('onboarding_step_completed', {
      step: stepKey,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Dismiss initial modal (without selecting goal)
   */
  async dismissInitialModal(): Promise<void> {
    this.analytics.trackEvent('onboarding_modal_dismissed', {
      timestamp: new Date().toISOString(),
    });

    // Just close the modal, don't set a goal
    // User can set it later from profile
  }

  /**
   * Reset onboarding (for testing/admin)
   */
  async resetOnboarding(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          primary_goal: null,
          onboarding: 'incomplete',
        })
        .eq('id', this.profileStore.profile()?.id);

      if (error) {
        console.error('Error resetting onboarding:', error);
        return;
      }

      await this.loadOnboardingStatus();
    } catch (err) {
      console.error('Error resetting onboarding:', err);
    }
  }
}
