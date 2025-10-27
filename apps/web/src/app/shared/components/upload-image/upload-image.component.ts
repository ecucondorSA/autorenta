import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface UploadFilePreview {
  name: string;
  url: string;
  file: File;
}

export interface FileValidationError {
  fileName: string;
  reason: string;
}

@Component({
  selector: 'app-upload-image',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './upload-image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadImageComponent {
  @Input() label = 'Fotos';
  @Input() multiple = true;
  @Input() maxSizeMB = 5; // Default 5MB
  @Input() acceptedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png']; // Default images only
  @Output() readonly filesSelected = new EventEmitter<FileList>();
  @Output() readonly validationErrors = new EventEmitter<FileValidationError[]>();

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024;

    // Validate each file
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i];

      // Check MIME type
      if (!this.acceptedTypes.includes(file.type)) {
        const allowedFormats = this.acceptedTypes
          .map((type) => type.split('/')[1].toUpperCase())
          .join(', ');
        errors.push({
          fileName: file.name,
          reason: `Formato no permitido. Solo se aceptan: ${allowedFormats}`,
        });
        continue;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push({
          fileName: file.name,
          reason: `El archivo supera el tamaño máximo de ${this.maxSizeMB}MB`,
        });
        continue;
      }

      // File is valid
      validFiles.push(file);
    }

    // Emit validation errors if any
    if (errors.length > 0) {
      this.validationErrors.emit(errors);
    }

    // Emit valid files if any
    if (validFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      validFiles.forEach((f) => dataTransfer.items.add(f));
      this.filesSelected.emit(dataTransfer.files);
    }

    // Reset input to allow re-selection of same file
    target.value = '';
  }
}
