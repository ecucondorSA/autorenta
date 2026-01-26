import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, LoadingController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import {
  MissionDetailGQL,
  MissionEntity,
  MissionsGQL,
  UpdateMissionGQL,
} from '@core/graphql/generated';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { UiService } from '@core/services/ui/ui.service';
import {
  MissionDetailModalComponent,
  MissionDetailModalData,
} from '@shared/components/mission-detail-modal/mission-detail-modal.component';
import {
  MissionProgressModalComponent,
  MissionProgressModalData,
} from '@shared/components/mission-progress-modal/mission-progress-modal.component';
import {
  MissionSubmissionModalComponent,
  MissionSubmissionModalData,
} from '@shared/components/mission-submission-modal/mission-submission-modal.component';
import {
  MissionVerificationModalComponent,
  MissionVerificationModalData,
} from '@shared/components/mission-verification-modal/mission-verification-modal.component';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
})
export class MissionDetailPage implements OnInit, OnDestroy {
  mission = signal<MissionEntity | null>(null);
  loading = signal(true);
  isOwner = signal(false);
  isScout = signal(false);
  isVerified = signal(false);
  isCompleted = signal(false);
  isSubmitted = signal(false);

  private routeSubscription?: Subscription;
  private missionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionDetailGQL: MissionDetailGQL,
    private missionsGQL: MissionsGQL,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private updateMissionGQL: UpdateMissionGQL,
    private toastSvc: ToastService,
    private authSvc: AuthService,
    private uiSvc: UiService
  ) {}

  async ngOnInit() {
    this.routeSubscription = this.route.paramMap.subscribe(async (params) => {
      this.missionId = params.get('id');
      if (this.missionId) {
        await this.loadMission(this.missionId);
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }

  async loadMission(id: string) {
    this.loading.set(true);
    const loading = await this.loadingCtrl.create({
      message: 'Loading mission...', // TODO: i18n
    });
    await loading.present();

    this.missionDetailGQL.fetch({ id }).subscribe((result) => {
      loading.dismiss();
      if (result.data?.mission) {
        this.mission.set(result.data.mission);
        this.isOwner.set(this.authSvc.currentUserId() === this.mission()?.ownerId);
        this.isScout.set(this.authSvc.currentUserId() === this.mission()?.scoutId);
        this.isVerified.set(this.mission()?.isVerified ?? false);
        this.isCompleted.set(this.mission()?.isCompleted ?? false);
        this.isSubmitted.set(this.mission()?.submission !== null);
      } else {
        this.toastSvc.toast('Failed to load mission', 'danger'); // TODO: i18n
        this.router.navigate(['/scout']);
      }
      this.loading.set(false);
    });
  }

  async openMissionDetailModal() {
    if (!this.mission()) return;

    const modal = await this.modalCtrl.create({
      component: MissionDetailModalComponent,
      componentProps: {
        mission: this.mission(),
      } as MissionDetailModalData,
    });
    modal.present();
    const result = await modal.onDidDismiss();
    if (result.role === 'success') {
      this.loadMission(this.missionId as string);
    }
  }

  async openMissionProgressModal() {
    if (!this.mission()) return;

    const modal = await this.modalCtrl.create({
      component: MissionProgressModalComponent,
      componentProps: {
        mission: this.mission(),
      } as MissionProgressModalData,
    });
    modal.present();
    const result = await modal.onDidDismiss();
    if (result.role === 'success') {
      this.loadMission(this.missionId as string);
    }
  }

  async openMissionSubmissionModal() {
    if (!this.mission()) return;

    const modal = await this.modalCtrl.create({
      component: MissionSubmissionModalComponent,
      componentProps: {
        mission: this.mission(),
      } as MissionSubmissionModalData,
    });
    modal.present();
    const result = await modal.onDidDismiss();
    if (result.role === 'success') {
      this.loadMission(this.missionId as string);
    }
  }

  async openMissionVerificationModal() {
    if (!this.mission()) return;

    const modal = await this.modalCtrl.create({
      component: MissionVerificationModalComponent,
      componentProps: {
        mission: this.mission(),
      } as MissionVerificationModalData,
    });
    modal.present();
    const result = await modal.onDidDismiss();
    if (result.role === 'success') {
      this.loadMission(this.missionId as string);
    }
  }

  async cancelMission() {
    if (!this.mission()) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancel Mission', // TODO: i18n
      message: 'Are you sure you want to cancel this mission?', // TODO: i18n
      buttons: [
        {
          text: 'Cancel', // TODO: i18n
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          },
        },
        {
          text: 'Confirm', // TODO: i18n
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Cancelling mission...', // TODO: i18n
            });
            await loading.present();

            this.updateMissionGQL
              .mutate({
                id: this.missionId as string,
                data: {
                  scoutId: null,
                },
              })
              .subscribe((result) => {
                loading.dismiss();
                if (result.data?.updateMission) {
                  this.toastSvc.toast('Mission cancelled', 'success'); // TODO: i18n
                  this.loadMission(this.missionId as string);
                } else {
                  this.toastSvc.toast('Failed to cancel mission', 'danger'); // TODO: i18n
                }
              });
          },
        },
      ],
    });

    await alert.present();
  }
}
