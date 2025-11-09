import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  VehicleDocumentsService,
  VehicleDocument,
  VehicleDocumentKind,
  UploadDocumentParams,
} from '../../../core/services/vehicle-documents.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * VehicleDocumentsPage
 *
 * Página de gestión de documentos del vehículo para owners.
 *
 * Características:
 * - Lista de documentos del auto
 * - Upload de nuevos documentos
 * - Ver estado de verificación
 * - Eliminar documentos pending
 * - Alertas de documentos próximos a vencer
 * - Validación de documentos requeridos
 *
 * Ruta: /cars/:id/documents
 */
@Component({
  selector: 'app-vehicle-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-documents.page.html',
  styleUrls: ['./vehicle-documents.page.css'],
})
export class VehicleDocumentsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentsService = inject(VehicleDocumentsService);
  private readonly toastService = inject(ToastService);

  readonly carId = signal<string>('');
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly documents = signal<VehicleDocument[]>([]);
  readonly expiringDocs = signal<VehicleDocument[]>([]);
  readonly showUploadModal = signal(false);

  // Upload form
  readonly uploadForm = signal({
    kind: 'registration' as VehicleDocumentKind,
    file: null as File | null,
    expiry_date: '',
    notes: '',
  });

  // Document kinds
  readonly documentKinds: VehicleDocumentKind[] = [
    'registration',
    'insurance',
    'technical_inspection',
    'circulation_permit',
    'ownership_proof',
  ];

  readonly requiredKinds: VehicleDocumentKind[] = [
    'registration',
    'insurance',
    'technical_inspection',
  ];

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/cars/my']);
      return;
    }

    this.carId.set(id);
    await this.loadDocuments();
    await this.loadExpiringDocuments();
  }

  async loadDocuments() {
    this.loading.set(true);
    try {
      this.documentsService.getCarDocuments(this.carId()).subscribe({
        next: (docs) => {
          this.documents.set(docs);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.toastService.error('Error de carga', 'No se pudieron cargar los documentos. Intenta nuevamente.');
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      this.toastService.error('Error de carga', 'No se pudieron cargar los documentos. Intenta nuevamente.');
      this.loading.set(false);
    }
  }

  async loadExpiringDocuments() {
    try {
      this.documentsService.getExpiringDocuments(this.carId()).subscribe({
        next: (docs) => {
          this.expiringDocs.set(docs);
        },
        error: (error) => {
          console.error('Error loading expiring documents:', error);
        },
      });
    } catch (error) {
      console.error('Error loading expiring documents:', error);
    }
  }

  openUploadModal(kind?: VehicleDocumentKind) {
    if (kind) {
      this.uploadForm.update((form) => ({ ...form, kind }));
    }
    this.showUploadModal.set(true);
  }

  closeUploadModal() {
    this.showUploadModal.set(false);
    this.resetUploadForm();
  }

  resetUploadForm() {
    this.uploadForm.set({
      kind: 'registration',
      file: null,
      expiry_date: '',
      notes: '',
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type (PDF, images)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      this.toastService.error('Formato inválido', 'Solo se permiten archivos PDF o imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('Archivo muy grande', 'El archivo no puede superar 5MB');
      return;
    }

    this.uploadForm.update((form) => ({ ...form, file }));
  }

  async uploadDocument() {
    const form = this.uploadForm();

    if (!form.file) {
      this.toastService.error('Archivo requerido', 'Selecciona un archivo para continuar');
      return;
    }

    this.uploading.set(true);

    try {
      const params: UploadDocumentParams = {
        car_id: this.carId(),
        kind: form.kind,
        file: form.file,
        expiry_date: form.expiry_date || undefined,
        notes: form.notes || undefined,
      };

      await this.documentsService.uploadDocument(params);

      this.toastService.success('Documento subido', 'El documento ha sido cargado exitosamente');
      this.closeUploadModal();
      await this.loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      this.toastService.error(
        'Error al subir',
        error instanceof Error ? error.message : 'No se pudo subir el documento. Intenta nuevamente.',
      );
    } finally {
      this.uploading.set(false);
    }
  }

  async deleteDocument(doc: VehicleDocument) {
    if (doc.status !== 'pending') {
      this.toastService.error('Acción no permitida', 'Solo puedes eliminar documentos pendientes');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este documento?')) {
      return;
    }

    try {
      await this.documentsService.deleteDocument(doc.id);
      this.toastService.success('Documento eliminado', 'El documento ha sido eliminado correctamente');
      await this.loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      this.toastService.error('Error al eliminar', 'No se pudo eliminar el documento. Intenta nuevamente.');
    }
  }

  async viewDocument(doc: VehicleDocument) {
    try {
      const url = await this.documentsService.getDocumentUrl(doc.storage_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      this.toastService.error('Error al abrir', 'No se pudo abrir el documento. Intenta nuevamente.');
    }
  }

  getDocumentByKind(kind: VehicleDocumentKind): VehicleDocument | undefined {
    return this.documents().find((doc) => doc.kind === kind);
  }

  hasDocument(kind: VehicleDocumentKind): boolean {
    return !!this.getDocumentByKind(kind);
  }

  isRequired(kind: VehicleDocumentKind): boolean {
    return this.requiredKinds.includes(kind);
  }

  getMissingRequiredDocs(): VehicleDocumentKind[] {
    return this.requiredKinds.filter(
      (kind) => !this.documents().some((doc) => doc.kind === kind && doc.status === 'verified'),
    );
  }

  getStatusColor(status: VehicleDocument['status']): string {
    const colors = {
      pending: 'status-pending',
      verified: 'status-verified',
      rejected: 'status-rejected',
    };
    return colors[status];
  }

  getDocumentKindLabel(kind: VehicleDocumentKind): string {
    return this.documentsService.getDocumentKindLabel(kind);
  }

  getStatusLabel(status: VehicleDocument['status']): string {
    return this.documentsService.getStatusLabel(status);
  }

  getDocumentKindIcon(kind: VehicleDocumentKind): string {
    return this.documentsService.getDocumentKindIcon(kind);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  isExpiring(date?: string): boolean {
    if (!date) return false;
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }

  isExpired(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  goBack() {
    this.router.navigate(['/cars', this.carId()]);
  }
}
