import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonToolbar,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { injectSupabase } from '../../../core/services/infrastructure/supabase-client.service';
import { ToastService } from '../../../core/services/ui/toast.service';
import { environment } from '../../../../environments/environment';

interface CampaignSchedule {
  id: string;
  name: string;
  title: string;
  description_content: string;
  image_url: string | null;
  cta_text: string;
  cta_url: string;
  platforms: string[];
  scheduled_for: string;
  time_until_publish?: string;
  time_since_publish?: string;
  status: string;
  post_ids?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  } | null;
}

@Component({
  selector: 'app-social-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonCheckbox,
    IonText,
    IonItem,
    IonLabel,
    IonSpinner,
    IonInput,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-text slot="start">
          <h1>📱 Marketing en Redes Sociales</h1>
        </ion-text>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Formulario para crear campaña -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Nueva Campaña</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <form [formGroup]="campaignForm" (ngSubmit)="createCampaign()">
            <!-- Título -->
            <ion-item>
              <ion-label position="floating">Título</ion-label>
              <ion-input
                formControlName="title"
                placeholder="Gana dinero alquilando tu auto"
              ></ion-input>
            </ion-item>

            <!-- Descripción -->
            <ion-item>
              <ion-label position="floating">Descripción</ion-label>
              <ion-input
                formControlName="description"
                placeholder="Alquila tu auto en AutoRenta y obtén hasta $500 USD mensuales"
                multiple
              ></ion-input>
            </ion-item>

            <!-- URL de Imagen -->
            <ion-item>
              <ion-label position="floating">URL de Imagen</ion-label>
              <ion-input
                formControlName="imageUrl"
                placeholder="https://..."
                type="url"
              ></ion-input>
            </ion-item>

            <!-- CTA Text -->
            <ion-item>
              <ion-label position="floating">Texto del Botón</ion-label>
              <ion-input formControlName="ctaText" placeholder="Conocer más"></ion-input>
            </ion-item>

            <!-- CTA URL -->
            <ion-item>
              <ion-label position="floating">URL del Botón</ion-label>
              <ion-input
                formControlName="ctaUrl"
                placeholder="https://autorentar.app/signup"
                type="url"
              ></ion-input>
            </ion-item>

            <!-- Plataformas -->
            <ion-item>
              <ion-label>Plataformas</ion-label>
            </ion-item>
            <ion-item>
              <ion-checkbox formControlName="facebook">Facebook</ion-checkbox>
              <ion-checkbox formControlName="instagram" slot="start">Instagram</ion-checkbox>
              <ion-checkbox formControlName="linkedin" slot="start">LinkedIn</ion-checkbox>
              <ion-checkbox formControlName="tiktok" slot="start">TikTok</ion-checkbox>
            </ion-item>

            <!-- Fecha y hora -->
            <ion-item>
              <ion-label position="floating">Publicar el</ion-label>
              <ion-input formControlName="scheduledFor" type="datetime-local"></ion-input>
            </ion-item>

            <!-- Botón submit -->
            <ion-button
              type="submit"
              color="primary"
              expand="block"
              [disabled]="!campaignForm.valid || isSubmitting()"
            >
              <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
              {{ isSubmitting() ? 'Guardando...' : '🚀 Programar Publicación' }}
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>

      <!-- Campañas programadas -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Campañas Programadas</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div *ngIf="upcomingCampaigns().length === 0" class="text-center">
            <p>No hay campañas programadas próximamente</p>
          </div>

          <div
            *ngFor="let campaign of upcomingCampaigns(); trackBy: trackByCampaignId"
            class="campaign-item ion-margin-bottom"
          >
            <h3>{{ campaign.name }}</h3>
            <p>{{ campaign.title }}</p>
            <div class="campaign-meta">
              <span>📅 {{ campaign.time_until_publish }}</span>
              <span>📱 {{ campaign.platforms.join(', ') }}</span>
              <span>{{ campaign.status }}</span>
            </div>
            <ion-button fill="outline" size="small" (click)="publishNow(campaign.id)">
              Publicar Ahora
            </ion-button>
            <ion-button
              fill="outline"
              size="small"
              color="danger"
              (click)="deleteCampaign(campaign.id)"
            >
              Cancelar
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Campañas publicadas -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Campañas Publicadas</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div *ngIf="recentlyPublished().length === 0" class="text-center">
            <p>No hay campañas publicadas recientemente</p>
          </div>

          <div
            *ngFor="let campaign of recentlyPublished(); trackBy: trackByCampaignId"
            class="campaign-item ion-margin-bottom"
          >
            <h3>{{ campaign.name }}</h3>
            <p>{{ campaign.title }}</p>
            <div class="campaign-meta">
              <span>✅ {{ campaign.status }}</span>
              <span>⏰ {{ campaign.time_since_publish }}</span>
            </div>
            <div *ngIf="campaign.post_ids" class="post-links">
              <a
                *ngIf="campaign.post_ids.facebook"
                href="{{ 'https://facebook.com/' + campaign.post_ids.facebook }}"
                target="_blank"
                class="post-link"
              >
                📘 Facebook
              </a>
              <a
                *ngIf="campaign.post_ids.instagram"
                href="{{ 'https://instagram.com/p/' + campaign.post_ids.instagram }}"
                target="_blank"
                class="post-link"
              >
                📷 Instagram
              </a>
              <a
                *ngIf="campaign.post_ids.linkedin"
                href="{{ 'https://linkedin.com/feed/update/' + campaign.post_ids.linkedin }}"
                target="_blank"
                class="post-link"
              >
                💼 LinkedIn
              </a>
              <a
                *ngIf="campaign.post_ids.tiktok"
                href="{{ 'https://tiktok.com/@auto.rentar/video/' + campaign.post_ids.tiktok }}"
                target="_blank"
                class="post-link"
              >
                🎵 TikTok
              </a>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      .campaign-item {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .campaign-meta {
        display: flex;
        gap: 12px;
        margin: 8px 0;
        font-size: 12px;
        color: #666;
      }

      .post-links {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }

      .post-link {
        padding: 4px 8px;
        background: #f0f0f0;
        border-radius: 4px;
        text-decoration: none;
        font-size: 12px;
        color: #333;

        &:hover {
          background: #e0e0e0;
        }
      }

      .text-center {
        text-align: center;
        color: #999;
      }
    `,
  ],
})
export class SocialCampaignsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = injectSupabase();
  private readonly toastService = inject(ToastService);

  campaignForm!: FormGroup;

  isSubmitting = signal(false);
  upcomingCampaigns = signal<CampaignSchedule[]>([]);
  recentlyPublished = signal<CampaignSchedule[]>([]);

  ngOnInit(): void {
    this.initForm();
    this.loadCampaigns();
  }

  trackByCampaignId(_index: number, campaign: CampaignSchedule): string {
    return campaign.id;
  }

  private initForm(): void {
    this.campaignForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      imageUrl: [''],
      ctaText: ['Conocer más', Validators.required],
      ctaUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\//)]],
      facebook: [true],
      instagram: [true],
      linkedin: [true],
      tiktok: [false],
      scheduledFor: ['', Validators.required],
    });
  }

  private async loadCampaigns(): Promise<void> {
    try {
      // Cargar campañas próximas
      const { data: upcoming } = (await this.supabase
        .from('upcoming_scheduled_campaigns')
        .select('*')) as { data: CampaignSchedule[] | null };

      if (upcoming) {
        this.upcomingCampaigns.set(upcoming);
      }

      // Cargar campañas recientes
      const { data: recent } = (await this.supabase
        .from('recently_published_campaigns')
        .select('*')) as { data: CampaignSchedule[] | null };

      if (recent) {
        this.recentlyPublished.set(recent);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }

  async createCampaign(): Promise<void> {
    if (!this.campaignForm.valid) {
      this.toastService.error('Formulario incompleto', 'Por favor completa todos los campos');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const platforms = [
        this.campaignForm.get('facebook')?.value && 'facebook',
        this.campaignForm.get('instagram')?.value && 'instagram',
        this.campaignForm.get('linkedin')?.value && 'linkedin',
        this.campaignForm.get('tiktok')?.value && 'tiktok',
      ].filter(Boolean);

      const { error } = await this.supabase.from('campaign_schedules').insert({
        name: this.campaignForm.get('title')?.value,
        title: this.campaignForm.get('title')?.value,
        description_content: this.campaignForm.get('description')?.value,
        image_url: this.campaignForm.get('imageUrl')?.value || null,
        cta_text: this.campaignForm.get('ctaText')?.value,
        cta_url: this.campaignForm.get('ctaUrl')?.value,
        platforms,
        scheduled_for: this.campaignForm.get('scheduledFor')?.value,
        status: 'scheduled',
      });

      if (error) throw error;

      this.toastService.success('Éxito', 'Campaña programada exitosamente');
      this.campaignForm.reset();
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async publishNow(campaignId: string): Promise<void> {
    try {
      const { data: campaign } = (await this.supabase
        .from('campaign_schedules')
        .select('*')
        .eq('id', campaignId)
        .single()) as { data: CampaignSchedule };

      if (!campaign) {
        this.toastService.error('Error', 'Campaña no encontrada');
        return;
      }

      // Llamar a Edge Function
      const { data: sessionData } = await this.supabase.auth.getSession();
      const response = await fetch(
        `${environment.supabaseUrl}/functions/v1/publish-to-social-media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData?.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            campaignId,
            title: campaign.title,
            description: campaign.description_content,
            imageUrl: campaign.image_url,
            ctaText: campaign.cta_text,
            ctaUrl: campaign.cta_url,
            platforms: campaign.platforms,
          }),
        },
      );

      if (!response.ok) throw new Error('Error publishing campaign');

      this.toastService.success('Éxito', 'Campaña publicada a todas las plataformas');
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error publishing campaign:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaign_schedules')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);

      if (error) throw error;

      this.toastService.success('Éxito', 'Campaña cancelada');
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      this.toastService.error(
        'Error',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }
}
