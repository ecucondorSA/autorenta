import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { logFileUpload, validateFiles } from '../../../core/utils/file-validation.util';

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

    // P0-014: Use centralized file validation with MIME type checking
    const validationResults = validateFiles(target.files, {
      maxSizeBytes: this.maxSizeMB * 1024 * 1024,
      allowedMimeTypes: this.acceptedTypes,
      checkMimeType: true,
    });

    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];

    // Process validation results
    validationResults.forEach((result, index) => {
      const file = target.files![index];

      if (result.valid) {
        validFiles.push(file);
        logFileUpload(file.name, true);
      } else {
        errors.push({
          fileName: result.fileName,
          reason: result.error || 'Invalid file',
        });
        logFileUpload(result.fileName, false, result.error);
      }
    });

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
