import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { catchError, combineLatest, map, Observable, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { AppRouteEnum } from '@core/enums/app-route.enum';
import { MissionStatusEnum } from '@core/enums/mission-status.enum';
import { MissionTypeEnum } from '@core/enums/mission-type.enum';
import { PaymentTypeEnum } from '@core/enums/payment-type.enum';
import { IRental } from '@core/interfaces/rental.interface';
import { IClient } from '@core/interfaces/client.interface';
import { IMission } from '@core/interfaces/mission.interface';
import { ICar } from '@core/interfaces/car.interface';
import { IUser } from '@core/interfaces/user.interface';
import { MissionService } from '@core/services/mission/mission.service';
import { RentalService } from '@core/services/rental/rental.service';
import { ClientService } from '@core/services/client/client.service';
import { CarService } from '@core/services/car/car.service';
import { UserService } from '@core/services/user/user.service';
import { selectAuthUser } from '../../../../../store/auth/auth.selectors';
import { MatDialog } from '@angular/material/dialog';
import { RejectMissionDialogComponent } from '../../components/reject-mission-dialog/reject-mission-dialog.component';
import { CompleteMissionDialogComponent } from '../../components/complete-mission-dialog/complete-mission-dialog.component';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/notification/notification.service';

@Component({
  selector: 'app-mission-detail-page',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPageComponent implements OnInit, OnDestroy {
  public missionId: string = this.route.snapshot.params['id'];
  public mission$!: Observable<IMission | undefined>;
  public rental$!: Observable<IRental | undefined>;
  public client$!: Observable<IClient | undefined>;
  public car$!: Observable<ICar | undefined>;
  public scout$!: Observable<IUser | undefined>;
  public missionStatusEnum = MissionStatusEnum;
  public missionTypeEnum = MissionTypeEnum;
  public paymentTypeEnum = PaymentTypeEnum;
  public form!: FormGroup;
  public appRoute = AppRouteEnum;
  public user$ = this.store.select(selectAuthUser);
  public missionStatusList = Object.values(MissionStatusEnum).filter(
    (status) => status !== MissionStatusEnum.PENDING
  );
  public MissionStatusEnum = MissionStatusEnum;
  public isMissionPending = false;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private rentalService: RentalService,
    private clientService: ClientService,
    private carService: CarService,
    private userService: UserService,
    private store: Store,
    private translate: TranslateService,
    private dialog: MatDialog,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.mission$ = this.missionService.getMission(this.missionId).pipe(
      tap((mission) => {
        if (mission?.status === MissionStatusEnum.PENDING) {
          this.isMissionPending = true;
        }
      })
    );
    this.rental$ = this.mission$.pipe(
      switchMap((mission) => {
        if (mission?.rentalId) {
          return this.rentalService.getRental(mission.rentalId);
        }
        return of(undefined);
      })
    );

    this.client$ = this.rental$.pipe(
      switchMap((rental) => {
        if (rental?.clientId) {
          return this.clientService.getClient(rental.clientId);
        }
        return of(undefined);
      })
    );

    this.car$ = this.rental$.pipe(
      switchMap((rental) => {
        if (rental?.carId) {
          return this.carService.getCar(rental.carId);
        }
        return of(undefined);
      })
    );

    this.scout$ = this.mission$.pipe(
      switchMap((mission) => {
        if (mission?.scoutId) {
          return this.userService.getUser(mission.scoutId);
        }
        return of(undefined);
      })
    );

    this.form = new FormGroup({
      status: new FormControl(null, [Validators.required]),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public updateMissionStatus(): void {
    if (this.form.invalid) {
      return;
    }

    this.missionService
      .updateMission(this.missionId, { status: this.form.value.status })
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.notificationService.success(
            this.translate.instant('mission.mission_status_updated')
          );
          this.router.navigate([AppRouteEnum.SCOUT, AppRouteEnum.MISSIONS]);
        }),
        catchError((error) => {
          console.error(error);
          this.notificationService.error(
            this.translate.instant('error.something_went_wrong')
          );
          return of(null);
        })
      )
      .subscribe();
  }

  public openRejectMissionDialog(): void {
    this.dialog.open(RejectMissionDialogComponent, {
      width: '500px',
      data: this.missionId,
    });
  }

  public openCompleteMissionDialog(): void {
    this.dialog.open(CompleteMissionDialogComponent, {
      width: '500px',
      data: this.missionId,
    });
  }

  public getStatusColor(status: MissionStatusEnum): string {
    switch (status) {
      case MissionStatusEnum.PENDING:
        return 'bg-warning-light';
      case MissionStatusEnum.IN_PROGRESS:
        return 'bg-info-light';
      case MissionStatusEnum.COMPLETED:
        return 'bg-success-light';
      case MissionStatusEnum.REJECTED:
        return 'bg-danger-light';
      default:
        return '';
    }
  }

  public getPaymentTypeLabel(paymentType: PaymentTypeEnum): string {
    return this.translate.instant(`payment_type.${paymentType}`);
  }

  public getMissionTypeLabel(missionType: MissionTypeEnum): string {
    return this.translate.instant(`mission_type.${missionType}`);
  }

  public navigateToRentalDetails(rentalId: string | undefined): void {
    if (rentalId) {
      this.router.navigate([AppRouteEnum.RENTALS, rentalId]);
    }
  }

  public getMissionStatusLabel(status: MissionStatusEnum): string {
    return this.translate.instant(`mission_status.${status}`);
  }
}
