import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonV2Component } from '../../shared-v2/ui/button.component';
import { CardComponent } from '../../shared-v2/ui/card.component';
import { InputComponent } from '../../shared-v2/ui/input.component';
import { ModalComponent } from '../../shared-v2/ui/modal.component';
import { BottomSheetComponent } from '../../shared-v2/ui/bottom-sheet.component';
import { FABComponent } from '../../shared-v2/ui/fab.component';
import { ChipComponent } from '../../shared-v2/ui/chip.component';
import { BadgeComponent } from '../../shared-v2/ui/badge.component';
import { ToastComponent } from '../../shared-v2/ui/toast.component';
import { SkeletonComponent } from '../../shared-v2/ui/skeleton.component';

/**
 * UI Components Showcase
 * Demo page for all V2 UI components
 */
@Component({
  selector: 'app-ui-showcase',
  standalone: true,
  imports: [
    CommonModule,
    ButtonV2Component,
    CardComponent,
    InputComponent,
    ModalComponent,
    BottomSheetComponent,
    FABComponent,
    ChipComponent,
    BadgeComponent,
    ToastComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="showcase">
      <!-- Header -->
      <header class="showcase-header">
        <h1>🎨 AutoRenta V2 UI Components</h1>
        <p>Librería mobile-first con 10 componentes core</p>
      </header>

      <div class="showcase-content">
        <!-- Buttons Section -->
        <section class="section">
          <h2>Buttons</h2>
          <div class="grid">
            <app-button-v2 variant="primary">Primary</app-button-v2>
            <app-button-v2 variant="secondary">Secondary</app-button-v2>
            <app-button-v2 variant="ghost">Ghost</app-button-v2>
            <app-button-v2 variant="danger">Danger</app-button-v2>
            <app-button-v2 variant="success">Success</app-button-v2>
          </div>

          <div class="grid">
            <app-button-v2 size="sm">Small</app-button-v2>
            <app-button-v2 size="md">Medium</app-button-v2>
            <app-button-v2 size="lg">Large</app-button-v2>
          </div>

          <div class="grid">
            <app-button-v2 [loading]="true">Loading</app-button-v2>
            <app-button-v2 [disabled]="true">Disabled</app-button-v2>
            <app-button-v2 [fullWidth]="true">Full Width</app-button-v2>
          </div>
        </section>

        <!-- Cards Section -->
        <section class="section">
          <h2>Cards</h2>
          <div class="grid">
            <app-card elevation="flat">
              <div>Flat elevation</div>
            </app-card>

            <app-card elevation="low">
              <div cardHeader>
                <h3>Card Header</h3>
              </div>
              <div>Card with header and content</div>
            </app-card>

            <app-card elevation="medium" [clickable]="true">
              <div>Clickable card</div>
            </app-card>
          </div>
        </section>

        <!-- Inputs Section -->
        <section class="section">
          <h2>Inputs</h2>
          <div class="input-grid">
            <app-input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              [value]="email()"
              (valueChange)="email.set($event)"
            />

            <app-input
              label="Password"
              type="password"
              placeholder="Tu contraseña"
              [value]="password()"
              (valueChange)="password.set($event)"
            />

            <app-input
              label="Descripción"
              type="textarea"
              [rows]="3"
              [maxLength]="200"
              [showCounter]="true"
            />

            <app-input
              label="Buscar"
              type="search"
              [clearable]="true"
              [value]="search()"
              (valueChange)="search.set($event)"
            />
          </div>
        </section>

        <!-- Chips Section -->
        <section class="section">
          <h2>Chips</h2>
          <div class="flex-wrap">
            <app-chip label="Automático" variant="filled" [active]="true" />
            <app-chip label="Manual" variant="outlined" />
            <app-chip label="4 puertas" variant="filled" [removable]="true" />
            <app-chip label="Aire acondicionado" color="primary" />
            <app-chip label="GPS" color="success" />
            <app-chip label="Seguro" color="warning" />
          </div>
        </section>

        <!-- Badges Section -->
        <section class="section">
          <h2>Badges</h2>
          <div class="flex-wrap">
            <div class="badge-demo">
              <button>Inbox</button>
              <app-badge [content]="5" color="danger" [anchored]="true" position="top-right" />
            </div>

            <div class="badge-demo">
              <button>Profile</button>
              <app-badge variant="dot" color="success" [anchored]="true" />
            </div>

            <app-badge [content]="12" color="primary" />
            <app-badge [content]="150" [max]="99" color="success" />
            <app-badge variant="dot" color="warning" [pulse]="true" />
          </div>
        </section>

        <!-- Skeletons Section -->
        <section class="section">
          <h2>Skeleton Loaders</h2>
          <div class="skeleton-grid">
            <app-skeleton variant="text" width="80%" />
            <app-skeleton variant="text" width="60%" />
            <app-skeleton variant="circle" width="56px" height="56px" />
            <app-skeleton variant="rectangle" height="100px" />
            <app-skeleton variant="button" width="120px" />
            <app-skeleton variant="card" height="200px" animation="wave" />
          </div>
        </section>

        <!-- Interactive Buttons -->
        <section class="section">
          <h2>Interactive Demos</h2>
          <div class="grid">
            <app-button-v2 (clicked)="showModal.set(true)">
              Open Modal
            </app-button-v2>

            <app-button-v2 (clicked)="showSheet.set(true)">
              Open Bottom Sheet
            </app-button-v2>

            <app-button-v2 (clicked)="showToast.set(true)">
              Show Toast
            </app-button-v2>
          </div>
        </section>
      </div>

      <!-- Modal Demo -->
      <app-modal
        [isOpen]="showModal()"
        title="Modal Demo"
        size="medium"
        [showFooter]="true"
        (closed)="showModal.set(false)"
      >
        <p>Este es un modal de ejemplo con animación slide-up.</p>
        <p>Puedes cerrarlo haciendo clic en el backdrop o presionando ESC.</p>

        <div modalFooter>
          <app-button-v2 variant="ghost" (clicked)="showModal.set(false)">
            Cancelar
          </app-button-v2>
          <app-button-v2 (clicked)="showModal.set(false)">
            Aceptar
          </app-button-v2>
        </div>
      </app-modal>

      <!-- Bottom Sheet Demo -->
      <app-bottom-sheet
        [isOpen]="showSheet()"
        title="Bottom Sheet Demo"
        snapPoint="half"
        [showFooter]="true"
        (closed)="showSheet.set(false)"
      >
        <p>Este es un bottom sheet con drag-to-dismiss.</p>
        <p>Arrastra hacia abajo para cerrar.</p>

        <div sheetFooter>
          <app-button-v2 [fullWidth]="true" (clicked)="showSheet.set(false)">
            Entendido
          </app-button-v2>
        </div>
      </app-bottom-sheet>

      <!-- Toast Demo -->
      <app-toast
        [isVisible]="showToast()"
        variant="success"
        title="¡Éxito!"
        message="La acción se completó correctamente"
        position="bottom"
        [duration]="3000"
        (closed)="showToast.set(false)"
      />

      <!-- FAB Demo -->
      <app-fab
        variant="regular"
        position="bottom-right"
        ariaLabel="Crear nuevo"
        (clicked)="handleFabClick()"
      >
        <svg fabIcon viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </app-fab>
    </div>
  `,
  styles: [`
    .showcase {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }

    .showcase-header {
      text-align: center;
      color: white;
      margin-bottom: 3rem;
    }

    .showcase-header h1 {
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
    }

    .showcase-header p {
      font-size: 1.125rem;
      opacity: 0.9;
      margin: 0;
    }

    .showcase-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    }

    .section h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 1.5rem;
      color: #1F2937;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .input-grid {
      display: grid;
      gap: 1.5rem;
    }

    .flex-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .badge-demo {
      position: relative;
      display: inline-block;
    }

    .badge-demo button {
      padding: 0.75rem 1.5rem;
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .skeleton-grid {
      display: grid;
      gap: 1rem;
    }

    /* Mobile adjustments */
    @media (max-width: 640px) {
      .showcase {
        padding: 1rem 0.5rem;
      }

      .section {
        padding: 1.5rem 1rem;
        border-radius: 12px;
      }

      .showcase-header h1 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class UIShowcasePage {
  // State
  showModal = signal(false);
  showSheet = signal(false);
  showToast = signal(false);

  email = signal('');
  password = signal('');
  search = signal('');

  handleFabClick(): void {
    console.log('FAB clicked!');
    this.showToast.set(true);
  }
}
