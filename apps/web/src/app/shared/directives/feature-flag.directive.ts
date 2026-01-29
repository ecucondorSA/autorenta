import { Directive, effect, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { FeatureFlagService } from '@core/services/infrastructure/feature-flag.service';

/**
 * Structural directive for conditionally rendering content based on feature flags
 *
 * Usage:
 * ```html
 * <div *appFeatureFlag="'new_booking_flow'">
 *   New booking flow content
 * </div>
 *
 * <div *appFeatureFlag="'new_booking_flow'; else oldFlow">
 *   New booking flow content
 * </div>
 * <ng-template #oldFlow>Old booking flow</ng-template>
 *
 * <div *appFeatureFlag="'new_booking_flow'; negate: true">
 *   Show when flag is DISABLED
 * </div>
 * ```
 */
@Directive({
  selector: '[appFeatureFlag]',
  standalone: true,
})
export class FeatureFlagDirective {
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly templateRef = inject(TemplateRef<FeatureFlagContext>);
  private readonly viewContainer = inject(ViewContainerRef);

  private flagName: string = '';
  private negate: boolean = false;
  private elseTemplate: TemplateRef<FeatureFlagContext> | null = null;
  private hasView = false;

  /**
   * The feature flag name to check
   */
  @Input()
  set appFeatureFlag(flagName: string) {
    this.flagName = flagName;
    this.updateView();
  }

  /**
   * Optional: Negate the condition (show when flag is disabled)
   */
  @Input()
  set appFeatureFlagNegate(negate: boolean) {
    this.negate = negate;
    this.updateView();
  }

  /**
   * Optional: Template to show when flag is disabled
   */
  @Input()
  set appFeatureFlagElse(templateRef: TemplateRef<FeatureFlagContext> | null) {
    this.elseTemplate = templateRef;
    this.updateView();
  }

  constructor() {
    // Use effect to react to flag changes
    effect(() => {
      // Access the flags signal to create dependency
      this.featureFlagService.flags();
      this.updateView();
    });
  }

  private updateView(): void {
    if (!this.flagName) return;

    const evaluation = this.featureFlagService.evaluate(this.flagName);
    const shouldShow = this.negate ? !evaluation.enabled : evaluation.enabled;

    const context: FeatureFlagContext = {
      $implicit: evaluation.enabled,
      appFeatureFlag: evaluation.enabled,
      reason: evaluation.reason,
    };

    if (shouldShow && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef, context);
      this.hasView = true;
    } else if (!shouldShow) {
      this.viewContainer.clear();
      this.hasView = false;

      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate, context);
      }
    }
  }

  /**
   * Static context guard for type checking in templates
   */
  static ngTemplateContextGuard(
    _dir: FeatureFlagDirective,
    _ctx: unknown,
  ): _ctx is FeatureFlagContext {
    return true;
  }
}

/**
 * Context available in the template
 */
interface FeatureFlagContext {
  $implicit: boolean;
  appFeatureFlag: boolean;
  reason: string;
}
