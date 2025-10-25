import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';
import type { Tour, StepOptions } from 'shepherd.js';
import { StepDefinition, TourId } from '../interfaces/tour-definition.interface';

export interface TourRendererAdapter {
  createTour(tourId: TourId, options?: any): void;
  addStep(step: StepDefinition, callbacks?: StepCallbacks): void;
  start(): void;
  next(): void;
  back(): void;
  show(stepId: string): void;
  complete(): void;
  cancel(): void;
  isActive(): boolean;
  getCurrentStepId(): string | undefined;
  destroy(): void;
}

export interface StepCallbacks {
  onShow?: () => void;
  onHide?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ShepherdAdapterService implements TourRendererAdapter {
  private tour?: Tour;
  private currentTourId?: TourId;
  private stepCallbacks = new Map<string, StepCallbacks>();

  createTour(tourId: TourId, options: any = {}): void {
    // Cleanup existing tour
    if (this.tour) {
      this.destroy();
    }

    this.currentTourId = tourId;

    const defaultOptions = {
      useModalOverlay: options.useModalOverlay ?? true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        canClickTarget: options.canClickTarget ?? true,
        scrollTo: {
          behavior: 'smooth',
          block: 'center',
        },
        classes: 'shepherd-theme-custom',
        ...options.stepOptions,
      },
    };

    this.tour = new Shepherd.Tour(defaultOptions);

    // Setup event listeners
    this.tour.on('show', (event) => {
      const stepId = event.step?.id;
      if (stepId) {
        const callbacks = this.stepCallbacks.get(stepId);
        callbacks?.onShow?.();
      }
    });

    this.tour.on('hide', (event) => {
      const stepId = event.step?.id;
      if (stepId) {
        const callbacks = this.stepCallbacks.get(stepId);
        callbacks?.onHide?.();
      }
    });

    this.tour.on('complete', () => {
      const currentStep = this.tour?.getCurrentStep();
      if (currentStep) {
        const callbacks = this.stepCallbacks.get(currentStep.id);
        callbacks?.onComplete?.();
      }
    });

    this.tour.on('cancel', () => {
      const currentStep = this.tour?.getCurrentStep();
      if (currentStep) {
        const callbacks = this.stepCallbacks.get(currentStep.id);
        callbacks?.onCancel?.();
      }
    });
  }

  addStep(stepDef: StepDefinition, callbacks?: StepCallbacks): void {
    if (!this.tour) {
      throw new Error('Tour not created. Call createTour() first.');
    }

    if (callbacks) {
      this.stepCallbacks.set(stepDef.id, callbacks);
    }

    const shepherdStep: StepOptions = {
      id: stepDef.id,
      title: stepDef.content.title,
      text: stepDef.content.html || this.formatText(stepDef.content.text),
    };

    // Attach to element if target is specified
    if (stepDef.target?.selector) {
      shepherdStep.attachTo = {
        element: stepDef.target.selector,
        on: (stepDef.position as any) || 'bottom',
      };
    }

    // Add buttons
    if (stepDef.buttons && stepDef.buttons.length > 0) {
      shepherdStep.buttons = stepDef.buttons.map((btn) => ({
        text: btn.text,
        classes: btn.classes || this.getButtonClasses(btn.action),
        action: () => this.handleButtonAction(btn.action, btn.customAction),
      }));
    } else {
      // Default buttons
      shepherdStep.buttons = [
        {
          text: 'Siguiente',
          classes: 'shepherd-button-primary',
          action: () => this.next(),
        },
      ];
    }

    this.tour.addStep(shepherdStep);
  }

  start(): void {
    if (!this.tour) {
      throw new Error('Tour not created');
    }
    this.tour.start();
  }

  next(): void {
    this.tour?.next();
  }

  back(): void {
    this.tour?.back();
  }

  show(stepId: string): void {
    this.tour?.show(stepId);
  }

  complete(): void {
    this.tour?.complete();
  }

  cancel(): void {
    this.tour?.cancel();
  }

  isActive(): boolean {
    return this.tour?.isActive() ?? false;
  }

  getCurrentStepId(): string | undefined {
    return this.tour?.getCurrentStep()?.id;
  }

  destroy(): void {
    if (this.tour) {
      if (this.tour.isActive()) {
        this.tour.cancel();
      }
      this.tour = undefined;
    }
    this.stepCallbacks.clear();
    this.currentTourId = undefined;
  }

  // Helper to get current step element
  getCurrentStepElement(): HTMLElement | undefined {
    const element = this.tour?.getCurrentStep()?.getElement();
    return element ?? undefined;
  }

  private formatText(text: string): string {
    return `<div class="tour-content">${text}</div>`;
  }

  private getButtonClasses(action: string): string {
    const baseClass = 'shepherd-button';
    switch (action) {
      case 'next':
        return `${baseClass} shepherd-button-primary`;
      case 'back':
        return `${baseClass} shepherd-button-secondary`;
      case 'skip':
        return `${baseClass} shepherd-button-secondary`;
      case 'complete':
        return `${baseClass} shepherd-button-primary`;
      default:
        return baseClass;
    }
  }

  private handleButtonAction(
    action: string,
    customAction?: () => void
  ): void {
    if (action === 'custom' && customAction) {
      customAction();
      return;
    }

    switch (action) {
      case 'next':
        this.next();
        break;
      case 'back':
        this.back();
        break;
      case 'skip':
        this.cancel();
        break;
      case 'complete':
        this.complete();
        break;
    }
  }
}
