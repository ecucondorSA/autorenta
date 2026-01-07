import { CommonModule } from '@angular/common';
import {Component, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { RouterModule } from '@angular/router';
import { OrganizationService, OrganizationMembership } from '../services/organization.service';

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule], // Añadir FormsModule
  template: `
    <div class="container mx-auto p-6">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Gestión de Flota</h1>
        @if (!isCreating()) {
          <button class="btn btn-primary" (click)="startCreating()">
            + Nueva Organización
          </button>
        }
      </div>
    
      <!-- Creation Form -->
      @if (isCreating()) {
        <div class="card bg-base-200 mb-8 p-4 animate-fade-in">
          <h3 class="font-bold mb-2">Crear Nueva Flota</h3>
          <div class="flex gap-2">
            <input
              type="text"
              [(ngModel)]="newOrgName"
              placeholder="Nombre de la empresa/flota"
              class="input input-bordered flex-grow"
              [disabled]="creatingLoading()"
              />
            <select [(ngModel)]="newOrgType" class="select select-bordered">
              <option value="fleet">Flota Privada</option>
              <option value="agency">Agencia</option>
              <option value="corporate">Corporativo</option>
            </select>
            <button
              class="btn btn-success"
              (click)="createOrg()"
              [disabled]="!newOrgName || creatingLoading()"
              >
              {{ creatingLoading() ? 'Creando...' : 'Confirmar' }}
            </button>
            <button class="btn btn-ghost" (click)="cancelCreating()">Cancelar</button>
          </div>
        </div>
      }
    
      @if (loading()) {
        <div class="loading loading-spinner loading-lg"></div>
      }
    
      @if (!loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Lista de Organizaciones -->
          @for (org of orgs(); track org) {
            <div
              class="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all"
              >
              <div class="card-body">
                <div class="flex justify-between items-start">
                  <h2 class="card-title">{{ org.name }}</h2>
                  <div class="badge" [ngClass]="org.verified ? 'badge-success' : 'badge-ghost'">
                    {{ org.verified ? 'Verificado' : 'No Verificado' }}
                  </div>
                </div>
                <p class="text-sm text-gray-500 mt-1">Tipo: {{ org.type | titlecase }}</p>
                <p class="text-sm font-medium">
                  Tu Rol: <span class="text-primary">{{ org.role | uppercase }}</span>
                </p>
                <div class="card-actions justify-end mt-4">
                  <button class="btn btn-sm btn-outline">Ver Autos</button>
                  <button class="btn btn-sm btn-ghost">Miembros</button>
                </div>
              </div>
            </div>
          }
          @if (orgs().length === 0 && !isCreating()) {
            <div class="alert alert-info col-span-full">
              No perteneces a ninguna organización de flota. ¡Crea una para empezar!
            </div>
          }
        </div>
      }
    </div>
    `,
})
export class OrganizationDashboardComponent implements OnInit {
  private orgService = inject(OrganizationService);

  orgs = signal<OrganizationMembership[]>([]);
  loading = signal(true);

  // Creation state
  isCreating = signal(false);
  creatingLoading = signal(false);
  newOrgName = '';
  newOrgType: 'fleet' | 'agency' | 'corporate' = 'fleet';

  async ngOnInit() {
    await this.loadOrgs();
  }

  async loadOrgs() {
    this.loading.set(true);
    try {
      const data = await this.orgService.getMyOrganizations();
      this.orgs.set(data);
    } catch (error) {
      console.error('Error loading orgs', error);
    } finally {
      this.loading.set(false);
    }
  }

  startCreating() {
    this.isCreating.set(true);
    this.newOrgName = '';
  }

  cancelCreating() {
    this.isCreating.set(false);
  }

  async createOrg() {
    if (!this.newOrgName) return;

    this.creatingLoading.set(true);
    try {
      await this.orgService.createOrganization(this.newOrgName, this.newOrgType);
      await this.loadOrgs(); // Recargar lista
      this.isCreating.set(false);
    } catch (error) {
      console.error('Error creating org', error);
      alert('Error al crear organización. Intenta nuevamente.');
    } finally {
      this.creatingLoading.set(false);
    }
  }
}
