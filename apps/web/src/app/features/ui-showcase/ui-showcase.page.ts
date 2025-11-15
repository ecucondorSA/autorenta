import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonV2Component } from '../../shared/components-v2/ui/button.component';
import { CardComponent } from '../../shared/components-v2/ui/card.component';
import { InputComponent } from '../../shared/components-v2/ui/input.component';
import { ModalComponent } from '../../shared/components-v2/ui/modal.component';
import { BottomSheetComponent } from '../../shared/components-v2/ui/bottom-sheet.component';
import { FABComponent } from '../../shared/components-v2/ui/fab.component';
import { ChipComponent } from '../../shared/components-v2/ui/chip.component';
import { BadgeComponent } from '../../shared/components-v2/ui/badge.component';
import { ToastComponent } from '../../shared/components-v2/ui/toast.component';
import { SkeletonComponent } from '../../shared/components-v2/ui/skeleton.component';

/**
 * UI Components Showcase V2
 * Interactive demo of all mobile-first components
 */
@Component({
  selector: 'app-ui-showcase-page',
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
        <h1>🎨 AutoRenta V2 Components</h1>
        <p>10 componentes mobile-first listos para usar</p>
      </header>

      <div class="showcase-content">
        <!-- Buttons Section -->
        <section class="section">
          <h2>🔘 Buttons</h2>
          <div class="subtitle">6 variantes, 3 tamaños, estados loading/disabled</div>

          <div class="grid">
            <app-button-v2 variant="primary">Primary</app-button-v2>
            <app-button-v2 variant="secondary">Secondary</app-button-v2>
            <app-button-v2 variant="ghost">Ghost</app-button-v2>
          </div>

          <div class="grid">
            <app-button-v2 variant="danger">Danger</app-button-v2>
            <app-button-v2 variant="success">Success</app-button-v2>
            <app-button-v2 [disabled]="true">Disabled</app-button-v2>
          </div>

          <div class="grid">
            <app-button-v2 size="sm">Small (36px)</app-button-v2>
            <app-button-v2 size="md">Medium (44px)</app-button-v2>
            <app-button-v2 size="lg">Large (52px)</app-button-v2>
          </div>

          <app-button-v2 [fullWidth]="true" [loading]="isLoading()">
            {{ isLoading() ? 'Cargando...' : 'Full Width Button' }}
          </app-button-v2>
        </section>

        <!-- Cards Section -->
        <section class="section">
          <h2>🃏 Cards</h2>
          <div class="subtitle">4 elevaciones, clickable, image support</div>

          <div class="cards-grid">
            <app-card elevation="flat">
              <div>
                <strong>Flat Card</strong>
                <p>Sin sombra, borde subtle</p>
              </div>
            </app-card>

            <app-card elevation="low">
              <div cardHeader>
                <h3 style="margin: 0; font-size: 1rem;">Low Elevation</h3>
              </div>
              <div>Con header y sombra suave</div>
            </app-card>

            <app-card elevation="medium" [clickable]="true">
              <div>
                <strong>Clickable Card</strong>
                <p>Hover para ver efecto</p>
              </div>
            </app-card>

            <app-card elevation="high">
              <div>
                <strong>High Elevation</strong>
                <p>Máxima profundidad</p>
              </div>
            </app-card>
          </div>
        </section>

        <!-- Inputs Section -->
        <section class="section">
          <h2>✏️ Inputs</h2>
          <div class="subtitle">8 tipos, validation, clear button</div>

          <div class="input-grid">
            <app-input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              [value]="email()"
              [required]="true"
              (valueChange)="email.set($event)"
            />

            <app-input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              helperText="Tu contraseña debe tener al menos 8 caracteres"
            />

            <app-input
              label="Búsqueda"
              type="search"
              placeholder="Buscar autos..."
              [clearable]="true"
              [value]="search()"
              (valueChange)="search.set($event)"
            />

            <app-input
              label="Descripción"
              type="textarea"
              [rows]="3"
              [maxLength]="200"
              [showCounter]="true"
              placeholder="Escribe una descripción..."
            />
          </div>
        </section>

        <!-- Chips Section -->
        <section class="section">
          <h2>🏷️ Chips</h2>
          <div class="subtitle">Filtros interactivos, removable, avatars</div>

          <div class="flex-wrap">
            <app-chip label="Automático" variant="filled" [active]="true" [clickable]="true" />
            <app-chip label="Manual" variant="outlined" [clickable]="true" />
            <app-chip label="4 puertas" variant="filled" [removable]="true" />
            <app-chip label="GPS" color="primary" />
            <app-chip label="Aire A/C" color="success" />
            <app-chip label="Seguro" color="warning" />
            <app-chip label="Bluetooth" color="danger" [removable]="true" />
          </div>
        </section>

        <!-- Badges Section -->
        <section class="section">
          <h2>🔔 Badges</h2>
          <div class="subtitle">Notificaciones, status, anchored positioning</div>

          <div class="flex-wrap">
            <div class="badge-demo">
              <button class="demo-button">Inbox</button>
              <app-badge [content]="5" color="danger" [anchored]="true" position="top-right" />
            </div>

            <div class="badge-demo">
              <button class="demo-button">Perfil</button>
              <app-badge variant="dot" color="success" [anchored]="true" />
            </div>

            <app-badge [content]="12" color="primary" />
            <app-badge [content]="150" [max]="99" color="success" />
            <app-badge variant="dot" color="warning" [pulse]="true" />
            <app-badge [content]="3" color="danger" [bounce]="true" />
          </div>
        </section>

        <!-- Skeletons Section -->
        <section class="section">
          <h2>💀 Skeleton Loaders</h2>
          <div class="subtitle">6 variantes, 3 animaciones (shimmer/pulse/wave)</div>

          <div class="skeleton-grid">
            <div>
              <strong>Text:</strong>
              <app-skeleton variant="text" width="80%" />
              <app-skeleton variant="text" width="60%" />
            </div>

            <div style="display: flex; gap: 1rem; align-items: center;">
              <strong>Avatar:</strong>
              <app-skeleton variant="avatar" size="lg" />
              <app-skeleton variant="circle" width="40px" height="40px" />
            </div>

            <div>
              <strong>Rectangle:</strong>
              <app-skeleton variant="rectangle" height="100px" />
            </div>

            <div>
              <strong>Button:</strong>
              <app-skeleton variant="button" width="150px" />
            </div>

            <div>
              <strong>Card (wave animation):</strong>
              <app-skeleton variant="card" height="180px" animation="wave" />
            </div>
          </div>
        </section>

        <!-- Interactive Demos -->
        <section class="section">
          <h2>⚡ Demos Interactivos</h2>
          <div class="subtitle">Modal, Bottom Sheet, Toast, FAB</div>

          <div class="grid">
            <app-button-v2 variant="primary" (clicked)="openModal()">
              🪟 Abrir Modal
            </app-button-v2>

            <app-button-v2 variant="secondary" (clicked)="openSheet()">
              📄 Abrir Sheet
            </app-button-v2>

            <app-button-v2 variant="success" (clicked)="showSuccessToast()">
              ✅ Toast Success
            </app-button-v2>

            <app-button-v2 variant="danger" (clicked)="showErrorToast()">
              ❌ Toast Error
            </app-button-v2>
          </div>
        </section>

        <!-- Stats Section -->
        <section class="section stats-section">
          <h2>📊 Estadísticas</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">10</div>
              <div class="stat-label">Componentes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">44</div>
              <div class="stat-label">Variantes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">22</div>
              <div class="stat-label">Estados</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">2.5K</div>
              <div class="stat-label">Líneas</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Modal Demo -->
      <app-modal
        [isOpen]="showModal()"
        title="🎉 Modal Demo"
        size="medium"
        [showFooter]="true"
        (closed)="closeModal()"
      >
        <div style="padding: 1rem 0;">
          <p><strong>Este es un modal con animación slide-up.</strong></p>
          <p>Características:</p>
          <ul>
            <li>✅ Backdrop con blur</li>
            <li>✅ Scroll lock automático</li>
            <li>✅ Cierre con ESC o backdrop</li>
            <li>✅ 4 tamaños (full/large/medium/small)</li>
            <li>✅ Safe-area support</li>
          </ul>
        </div>

        <div modalFooter>
          <app-button-v2 variant="ghost" (clicked)="closeModal()"> Cancelar </app-button-v2>
          <app-button-v2 variant="primary" (clicked)="closeModal()"> Aceptar </app-button-v2>
        </div>
      </app-modal>

      <!-- Bottom Sheet Demo -->
      <app-bottom-sheet
        [isOpen]="showSheet()"
        title="📱 Bottom Sheet"
        snapPoint="half"
        [showFooter]="true"
        (closed)="closeSheet()"
      >
        <div style="padding: 1rem 0;">
          <p><strong>Arrastra hacia abajo para cerrar</strong></p>
          <p>Features:</p>
          <ul>
            <li>✅ Drag-to-dismiss gesture</li>
            <li>✅ 3 snap points (30%/50%/90%)</li>
            <li>✅ Touch y mouse support</li>
            <li>✅ Smooth animations</li>
          </ul>
        </div>

        <div sheetFooter>
          <app-button-v2 [fullWidth]="true" variant="primary" (clicked)="closeSheet()">
            Entendido
          </app-button-v2>
        </div>
      </app-bottom-sheet>

      <!-- Toast Success -->
      <app-toast
        [isVisible]="showToastSuccess()"
        variant="success"
        title="¡Éxito!"
        message="La operación se completó correctamente"
        position="bottom"
        [duration]="3000"
        actionLabel="Ver"
        (closed)="hideToastSuccess()"
        (actionClicked)="handleToastAction()"
      />

      <!-- Toast Error -->
      <app-toast
        [isVisible]="showToastError()"
        variant="error"
        title="Error"
        message="Ocurrió un error al procesar la solicitud"
        position="bottom"
        [duration]="3000"
        (closed)="hideToastError()"
      />

      <!-- FAB -->
      <app-fab
        variant="regular"
        position="bottom-right"
        ariaLabel="Crear nuevo"
        color="primary"
        (clicked)="handleFabClick()"
      >
        <svg
          fabIcon
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          style="width: 24px; height: 24px;"
        >
          <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round" />
        </svg>
      </app-fab>
    </div>
  `,
  styles: [
    `
      .showcase {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem 1rem 6rem;
      }

      .showcase-header {
        text-align: center;
        color: white;
        margin-bottom: 3rem;
        animation: fadeInDown 0.6s ease;
      }

      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .showcase-header h1 {
        font-size: 2.5rem;
        font-weight: 800;
        margin: 0 0 0.5rem;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }

      .showcase-header p {
        font-size: 1.125rem;
        opacity: 0.95;
        margin: 0;
      }

      .showcase-content {
        max-width: 1200px;
        margin: 0 auto;
      }

      .section {
        background: white;
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        animation: fadeInUp 0.6s ease;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .section h2 {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
        color: #1f2937;
      }

      .subtitle {
        color: #6b7280;
        margin-bottom: 1.5rem;
        font-size: 0.9375rem;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .grid:last-child {
        margin-bottom: 0;
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
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

      .demo-button {
        padding: 0.75rem 1.5rem;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.2s;
      }

      .demo-button:hover {
        background: #4338ca;
      }

      .skeleton-grid {
        display: grid;
        gap: 2rem;
      }

      .skeleton-grid > div {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .stats-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .stats-section h2 {
        color: white;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      .stat-card {
        text-align: center;
        padding: 1.5rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(10px);
      }

      .stat-number {
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 0.5rem;
      }

      .stat-label {
        font-size: 0.875rem;
        opacity: 0.9;
      }

      /* Mobile adjustments */
      @media (max-width: 640px) {
        .showcase {
          padding: 1rem 0.5rem 5rem;
        }

        .section {
          padding: 1.5rem 1rem;
          border-radius: 16px;
        }

        .showcase-header h1 {
          font-size: 1.75rem;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UIShowcasePage {
  // State
  showModal = signal(false);
  showSheet = signal(false);
  showToastSuccess = signal(false);
  showToastError = signal(false);
  isLoading = signal(false);

  email = signal('');
  search = signal('');

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  openSheet(): void {
    this.showSheet.set(true);
  }

  closeSheet(): void {
    this.showSheet.set(false);
  }

  showSuccessToast(): void {
    this.showToastSuccess.set(true);
  }

  hideToastSuccess(): void {
    this.showToastSuccess.set(false);
  }

  showErrorToast(): void {
    this.showToastError.set(true);
  }

  hideToastError(): void {
    this.showToastError.set(false);
  }

  handleFabClick(): void {
    this.showToastSuccess.set(true);
  }

  handleToastAction(): void {
    console.log('Toast action clicked');
    this.showToastSuccess.set(false);
  }
}
