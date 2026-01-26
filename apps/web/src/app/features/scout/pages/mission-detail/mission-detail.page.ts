import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { Mission } from '@models/mission.model';
import { AppState } from '@store/app.state';
import { selectMission } from '@store/mission/mission.selectors';
import { LoadMission } from '@store/mission/mission.actions';
import { PaymentModalComponent } from '@shared/components/payment-modal/payment-modal.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ApiService } from '@core/services/api/api.service';
import { NotificationService } from '@core/services/notification/notification.service';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit, OnDestroy {
  mission$ = this.store.select(selectMission);
  missionForm: FormGroup;
  mission: Mission;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store<AppState>,
    private dialog: MatDialog,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const missionId = params['id'];
      this.store.dispatch(new LoadMission(missionId));
    });

    this.mission$.pipe(takeUntil(this.destroy$)).subscribe(mission => {
      if (mission) {
        this.mission = mission;
        this.missionForm = new FormGroup({
          title: new FormControl(mission.title, Validators.required),
          description: new FormControl(mission.description, Validators.required),
          reward: new FormControl(mission.reward, Validators.required),
          status: new FormControl(mission.status, Validators.required),
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openPaymentModal(): void {
    this.dialog.open(PaymentModalComponent, {
      width: '500px',
    });
  }

  confirmMission(): void {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '500px',
      data: {
        title: this.translateService.instant('missionDetail.confirmModal.title'),
        message: this.translateService.instant('missionDetail.confirmModal.message'),
        confirmButtonText: this.translateService.instant('missionDetail.confirmModal.confirm'),
        cancelButtonText: this.translateService.instant('missionDetail.confirmModal.cancel'),
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle confirmation logic here
        console.log('Mission confirmed!');
      }
    });
  }

  rejectMission(): void {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '500px',
      data: {
        title: this.translateService.instant('missionDetail.rejectModal.title'),
        message: this.translateService.instant('missionDetail.rejectModal.message'),
        confirmButtonText: this.translateService.instant('missionDetail.rejectModal.confirm'),
        cancelButtonText: this.translateService.instant('missionDetail.rejectModal.cancel'),
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle rejection logic here
        console.log('Mission rejected!');
      }
    });
  }

  editMission(): void {
    this.router.navigate(['/missions', this.mission.id, 'edit']);
  }

  deleteMission(): void {
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '500px',
      data: {
        title: this.translateService.instant('missionDetail.deleteModal.title'),
        message: this.translateService.instant('missionDetail.deleteModal.message'),
        confirmButtonText: this.translateService.instant('missionDetail.deleteModal.confirm'),
        cancelButtonText: this.translateService.instant('missionDetail.deleteModal.cancel'),
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.deleteMission(this.mission.id).subscribe(() => {
          this.notificationService.success(this.translateService.instant('missionDetail.deleteSuccess'));
          this.router.navigate(['/missions']);
        });
      }
    });
  }

  // example of using any, to be removed later
  example(input: any): void {
    console.log(input);
  }

  example2(input: any, event: any): void {
    console.log(input, event);
  }

  example3(input: any): void {
    console.log(input);
  }

  example4(input: any): void {
    console.log(input);
  }

  example5(input: any): void {
    console.log(input);
  }

  example6(input: any): void {
    console.log(input);
  }

  example7(input: any): void {
    console.log(input);
  }

  example8(input: any): void {
    console.log(input);
  }
}
