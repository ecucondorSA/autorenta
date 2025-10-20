import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface UploadFilePreview {
  name: string;
  url: string;
  file: File;
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
  @Output() readonly filesSelected = new EventEmitter<FileList>();

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      this.filesSelected.emit(target.files);
    }
  }
}
