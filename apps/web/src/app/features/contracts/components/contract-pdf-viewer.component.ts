import {Component, Input,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Contract PDF Viewer Component
 *
 * Visualiza un PDF del contrato en un iframe
 * o proporciona un enlace para abrirlo en nueva pestaña
 */
@Component({
  selector: 'app-contract-pdf-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="pdf-viewer">
      <!-- PDF Embed (works for signed URLs from Supabase Storage) -->
      <div class="pdf-container">
        <iframe [src]="safePdfUrl" class="pdf-iframe" title="Contrato PDF"></iframe>
      </div>

      <!-- Fallback: Open in new tab -->
      <div class="pdf-actions">
        <a [href]="pdfUrl" target="_blank" rel="noopener noreferrer" class="open-pdf-link">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Abrir en nueva pestaña
        </a>
        <p class="pdf-hint">
          Si el PDF no se visualiza correctamente, usa el botón de arriba para abrirlo
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .pdf-viewer {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .pdf-container {
        width: 100%;
        height: 600px;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
        background: #f3f4f6;
      }

      .pdf-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      .pdf-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .open-pdf-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        background: #3b82f6;
        color: white;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
      }

      .open-pdf-link:hover {
        background: #2563eb;
      }

      .pdf-hint {
        font-size: 0.75rem;
        color: #6b7280;
        text-align: center;
      }

      @media (max-width: 768px) {
        .pdf-container {
          height: 400px;
        }
      }
    `,
  ],
})
export class ContractPdfViewerComponent {
  @Input() set pdfUrl(url: string) {
    this._pdfUrl = url;
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  get pdfUrl(): string {
    return this._pdfUrl;
  }

  private _pdfUrl = '';
  safePdfUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer) {}
}
