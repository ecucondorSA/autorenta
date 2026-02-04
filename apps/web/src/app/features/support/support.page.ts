import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ToastService } from '@core/services/ui/toast.service';
import { SupportService } from './services/support.service';
import {
  TICKET_CATEGORIES,
  TICKET_URGENCY_LEVELS,
  TICKET_STATUS_MAP,
  CreateTicketData,
  TicketUrgencyOption,
} from './models/support.models';

type TabType = 'form' | 'tickets';

@Component({
  selector: 'app-support',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './support.page.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      ion-content {
        --padding-bottom: 24px;
      }
    `,
  ],
})
export class SupportPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supportService = inject(SupportService);
  private readonly toastService = inject(ToastService);

  // State from service
  readonly loading = this.supportService.loading;
  readonly tickets = this.supportService.tickets;

  // Local state
  readonly submitting = signal(false);
  readonly uploadingFiles = signal(false);
  readonly pendingAttachments = signal<string[]>([]);
  readonly selectedTab = signal<TabType>('form');

  // Form
  ticketForm!: FormGroup;

  // Constants for template
  readonly categories = TICKET_CATEGORIES;
  readonly urgencyLevels = TICKET_URGENCY_LEVELS;
  readonly statusMap = TICKET_STATUS_MAP;

  ngOnInit(): void {
    this.initForm();
    void this.loadTickets();
  }

  private initForm(): void {
    this.ticketForm = this.fb.group({
      category: ['', Validators.required],
      urgency: ['medium', Validators.required],
      subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  private async loadTickets(): Promise<void> {
    try {
      await this.supportService.loadTickets();
    } catch {
      this.toastService.error('Error', 'No pudimos cargar tus tickets');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      const formValue = this.ticketForm.value;
      const ticketData: CreateTicketData = {
        category: formValue.category,
        urgency: formValue.urgency,
        subject: formValue.subject,
        description: formValue.description,
        attachment_urls: this.pendingAttachments(),
      };

      const ticket = await this.supportService.createTicket(ticketData);

      this.toastService.success('Ticket creado', `Tu ticket #${ticket.id.slice(0, 8)} fue creado`);

      // Reset form
      this.ticketForm.reset({ urgency: 'medium' });
      this.pendingAttachments.set([]);

      // Switch to tickets tab
      this.selectedTab.set('tickets');
    } catch {
      this.toastService.error('Error', 'No pudimos crear tu ticket. Intenta de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.uploadingFiles.set(true);

    try {
      const urls = await this.supportService.uploadAttachments(Array.from(files));
      this.pendingAttachments.update((current) => [...current, ...urls]);
      this.toastService.success('Archivos subidos', `${files.length} archivo(s) adjuntado(s)`);
    } catch {
      this.toastService.error('Error', 'No pudimos subir los archivos');
    } finally {
      this.uploadingFiles.set(false);
      input.value = ''; // Reset input
    }
  }

  removeAttachment(index: number): void {
    this.pendingAttachments.update((current) => current.filter((_, i) => i !== index));
  }

  selectTab(tab: TabType): void {
    this.selectedTab.set(tab);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.ticketForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return null;

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) {
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (field.errors['maxlength']) {
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return 'Campo inválido';
  }

  getCategoryIcon(icon: string): string {
    const icons: Record<string, string> = {
      calendar: 'calendar-outline',
      'credit-card': 'card-outline',
      car: 'car-outline',
      user: 'person-outline',
      shield: 'shield-checkmark-outline',
      wrench: 'construct-outline',
      lightbulb: 'bulb-outline',
      help: 'help-circle-outline',
    };
    return icons[icon] || 'help-circle-outline';
  }

  getUrgencyInfo(urgency: string): TicketUrgencyOption | undefined {
    return TICKET_URGENCY_LEVELS.find((u) => u.value === urgency);
  }
}
