import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisputeEvidenceService, EvidenceItem } from '../../services/dispute-evidence.service';

@Component({
  selector: 'app-evidence-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="evidence-upload p-4 border rounded-lg bg-base-100">
      <h3 class="font-bold mb-2">Evidencia (Fotos/Docs)</h3>
      
      <input 
        type="file" 
        (change)="onFileSelected($event)" 
        class="file-input file-input-bordered w-full max-w-xs" 
        [disabled]="uploading()"
      />
      
      <div *ngIf="uploading()" class="mt-2">Subiendo...</div>
      
      <ul class="mt-4 list-disc pl-4">
        <li *ngFor="let item of evidenceList()">
          <a [href]="item.path" target="_blank" class="link">{{ item.path }}</a>
        </li>
      </ul>
    </div>
  `
})
export class EvidenceUploaderComponent {
  @Input({ required: true }) disputeId!: string;
  
  private evidenceService = inject(DisputeEvidenceService);
  uploading = signal(false);
  evidenceList = signal<EvidenceItem[]>([]);

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    try {
      await this.evidenceService.uploadEvidence(this.disputeId, file);
      await this.refreshList();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      this.uploading.set(false);
    }
  }

  async refreshList() {
    const items = await this.evidenceService.getEvidence(this.disputeId);
    this.evidenceList.set(items || []);
  }
}
