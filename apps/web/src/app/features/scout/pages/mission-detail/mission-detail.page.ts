import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { catchError, combineLatest, map, Observable, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { MissionDetailActions } from './mission-detail.actions';
import { selectMissionDetail, selectMissionDetailLoading } from './mission-detail.selectors';
import { Mission } from '@models/mission.model';
import { Marker } from '@models/marker.model';
import { MarkerService } from '@core/services/marker.service';
import { MissionService } from '@core/services/mission.service';
import { NotificationService } from '@core/services/notification.service';
import { AppState } from '@store';
import { Car } from '@models/car.model';
import { CarService } from '@core/services/car.service';
import { UserService } from '@core/services/user.service';
import { User } from '@models/user.model';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit, OnDestroy {
  missionDetail$ = this.store.select(selectMissionDetail);
  missionDetailLoading$ = this.store.select(selectMissionDetailLoading);
  missionId: string = this.route.snapshot.params['id'];
  markers$: Observable<Marker[]> = of([]);
  selectedCarId: string | null = null;
  missionForm = new FormGroup({
    car: new FormControl(null),
  });
  cars$: Observable<Car[]> = of([]);
  user$: Observable<User | null> = this.userService.getUser();
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AppState>,
    private route: ActivatedRoute,
    private markerService: MarkerService,
    private missionService: MissionService,
    private router: Router,
    private translateService: TranslateService,
    private notificationService: NotificationService,
    private carService: CarService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.store.dispatch(MissionDetailActions.loadMissionDetail({ id: this.missionId }));

    this.missionDetail$
      .pipe(
        takeUntil(this.destroy$),
        tap((mission) => {
          if (mission) {
            this.markers$ = this.markerService.getMissionMarkers(mission);
          }
        })
      )
      .subscribe();

    this.cars$ = combineLatest([this.missionDetail$, this.user$]).pipe(
      switchMap(([mission, user]) => {
        if (mission && user) {
          return this.carService.getCarsByMissionAndUser(mission, user);
        }
        return of([]);
      })
    );

    this.missionForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap((value) => {
          this.selectedCarId = value.car;
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async startMission(): Promise<void> {
    const mission = await this.missionDetail$.pipe(takeUntil(this.destroy$)).toPromise();
    const carId = this.missionForm.get('car')?.value;

    if (!mission) {
      this.notificationService.error(this.translateService.instant('MISSION_DETAIL.MISSION_NOT_FOUND'));
      return;
    }

    if (!carId) {
      this.notificationService.error(this.translateService.instant('MISSION_DETAIL.CAR_NOT_SELECTED'));
      return;
    }

    this.missionService
      .startMission(mission.id, carId)
      .pipe(
        catchError((err) => {
          this.notificationService.error(this.translateService.instant('MISSION_DETAIL.MISSION_START_ERROR'));
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        if (response) {
          this.notificationService.success(this.translateService.instant('MISSION_DETAIL.MISSION_STARTED'));
          this.router.navigate(['/scout/active-mission']);
        }
      });
  }

  getCarImage(car: Car | undefined): string {
    return car?.images?.[0]?.url || 'assets/img/placeholder.png';
  }

  get isMissionStarted(): Observable<boolean> {
    return this.missionDetail$.pipe(
      map((mission) => {
        return !!mission?.startTime;
      })
    );
  }
}
