/**
 * SECTION CARD COMPONENT
 *
 * Reusable wrapper for all profile sections.
 * Provides consistent UI for:
 * - Section header (title, description, icon)
 * - Edit mode toggle
 * - Save/Cancel actions
 * - Loading states
 * - Error handling
 * - Read-only mode
 *
 * Usage:
 * ```html
 * <app-section-card
 *   [title]="'Información de Identidad'"
 *   [description]="'Datos personales requeridos para verificación'"
 *   [icon]="'person'"
 *   [isEditing]="isEditing"
 *   [loading]="loading"
 *   [error]="error"
 *   [isDirty]="isDirty"
 *   [isValid]="isValid"
 *   (saveRequested)="handleSave()"
 *   (cancelRequested)="handleCancel()"
 * >
 *   <!-- Section content projected here -->
 *   <form [formGroup]="form">
 *     ...
 *   </form>
 * </app-section-card>
 * ```
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
  templateUrl: './section-card.component.html',
  styleUrls: ['./section-card.component.scss'],
})
export class SectionCardComponent {
  // Section metadata
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() icon?: string;

  // State
  @Input() readonly = false;
  @Input() showEditButton = true;
  @Input() showActions = true;

  // Reactive state (can be signals or plain booleans)
  @Input() isEditing: WritableSignal<boolean> | boolean = signal(false);
  @Input() loading: WritableSignal<boolean> | boolean = signal(false);
  @Input() error: WritableSignal<string | null> | string | null = signal<string | null>(null);
  @Input() isDirty: WritableSignal<boolean> | boolean = signal(false);
  @Input() isValid: WritableSignal<boolean> | boolean = signal(true);

  // Events
  @Output() saveRequested = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();

  /**
   * Helper to get boolean value from signal or plain boolean
   */
  getValue<T>(value: WritableSignal<T> | T): T {
    return typeof value === 'function' ? (value as WritableSignal<T>)() : value;
  }

  /**
   * Check if currently editing
   */
  get isEditingValue(): boolean {
    return this.getValue(this.isEditing);
  }

  /**
   * Check if loading
   */
  get loadingValue(): boolean {
    return this.getValue(this.loading);
  }

  /**
   * Get error message
   */
  get errorValue(): string | null {
    return this.getValue(this.error);
  }

  /**
   * Check if form is dirty
   */
  get isDirtyValue(): boolean {
    return this.getValue(this.isDirty);
  }

  /**
   * Check if form is valid
   */
  get isValidValue(): boolean {
    return this.getValue(this.isValid);
  }

  /**
   * Start editing mode
   */
  startEdit(): void {
    if (this.readonly) return;

    if (typeof this.isEditing === 'function') {
      (this.isEditing as WritableSignal<boolean>).set(true);
    }

    this.editRequested.emit();
  }

  /**
   * Handle save action
   */
  handleSave(): void {
    this.saveRequested.emit();
  }

  /**
   * Handle cancel action
   */
  handleCancel(): void {
    this.cancelRequested.emit();
  }

  /**
   * Check if save button should be disabled
   */
  get isSaveDisabled(): boolean {
    return !this.isDirtyValue || !this.isValidValue || this.loadingValue;
  }
}
