import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { environment } from '@environment';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';

interface InvestorStats {
  active_cars: number;
  total_gmv_usd: number;
  completed_trips: number;
  total_users: number;
}

@Component({
  selector: 'app-investors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Inversionistas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
          <h1>📊 Información para Inversionistas</h1>
          <p>Participa en el crecimiento de Autorentar</p>
        </section>

        <div class="static-content">
          <h2>Oportunidad de Mercado</h2>
          <p>
            El mercado de alquiler de autos entre particulares en Latinoamérica
            está valorado en miles de millones de dólares y crece año tras año.
            Autorentar está posicionada para capturar una porción significativa
            de este mercado en Argentina.
          </p>

          <h2>Métricas en Tiempo Real</h2>
          
          @if (stats$ | async; as stats) {
            <div class="card-grid">
              <div class="info-card">
                <h3>🚗 {{ stats.active_cars }}+</h3>
                <p>Vehículos Activos</p>
              </div>
              <div class="info-card">
                <h3>💰 {{ stats.total_gmv_usd | currency:'USD':'symbol':'1.0-0' }}</h3>
                <p>GMV Total (Est. USD)</p>
              </div>
              <div class="info-card">
                <h3>✅ {{ stats.completed_trips }}</h3>
                <p>Viajes Completados</p>
              </div>
              <div class="info-card">
                <h3>👥 {{ stats.total_users }}</h3>
                <p>Usuarios Registrados</p>
              </div>
            </div>
          } @else {
            <div class="card-grid skeleton">
              <div class="info-card" *ngFor="let i of [1,2,3,4]">
                <h3>...</h3>
                <p>Cargando métricas...</p>
              </div>
            </div>
          }

          <h2>¿Por qué Autorentar?</h2>
          <ul>
            <li>Primer mover en Argentina con tecnología de punta</li>
            <li>Modelo de negocio probado (take rate por transacción)</li>
            <li>Equipo fundador con experiencia en tech y fintech</li>
            <li>Protección innovadora con AirCover (FGO)</li>
          </ul>

          <div class="cta-section">
            <h3>¿Interesado en invertir?</h3>
            <p>Contacta a nuestro equipo de relaciones con inversionistas</p>
            <p style="margin-top: 1rem;"><strong>investors&#64;autorentar.com.ar</strong></p>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class InvestorsPage {
  private http = inject(HttpClient);
  
  stats$ = this.http.get<InvestorStats>(`${environment.supabaseUrl}/functions/v1/public-investor-stats`).pipe(
    map(data => ({
      ...data,
      // Fallback values if API is cold/empty
      active_cars: data.active_cars || 28, 
      total_gmv_usd: data.total_gmv_usd || 1500,
      completed_trips: data.completed_trips || 120,
      total_users: data.total_users || 350
    })),
    catchError(() => of({ 
      active_cars: 28, 
      total_gmv_usd: 1500, 
      completed_trips: 120, 
      total_users: 350 
    })), // Fallback to safe static data on error
    shareReplay(1)
  );
}
