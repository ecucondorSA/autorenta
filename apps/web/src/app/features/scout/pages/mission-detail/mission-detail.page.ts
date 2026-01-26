import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, Observable, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { MissionDetailActions } from './mission-detail.actions';
import { MissionDetailSelectors } from './mission-detail.selectors';
import { Mission, MissionStatus } from '@models/mission.model';
import { AppState } from '@store';
import { Marker } from '@models/marker.model';
import { Car } from '@models/car.model';
import { User } from '@models/user.model';
import { MissionsService } from '@core/services/missions/missions.service';
import { AlertService } from '@core/services/alert/alert.service';
import { UserService } from '@core/services/user/user.service';
import { Roles } from '@enums/roles.enum';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit, OnDestroy {
  readonly Roles = Roles;
  missionId: string = this.route.snapshot.params['id'];
  destroy$ = new Subject<void>();
  mission$: Observable<Mission | undefined> = this.store.select(MissionDetailSelectors.selectMission);
  missionStatus$: Observable<MissionStatus | undefined> = this.store.select(MissionDetailSelectors.selectMissionStatus);
  missionCars$: Observable<Car[]> = this.store.select(MissionDetailSelectors.selectMissionCars);
  missionMarkers$: Observable<Marker[]> = this.store.select(MissionDetailSelectors.selectMissionMarkers);
  missionUsers$: Observable<User[]> = this.store.select(MissionDetailSelectors.selectMissionUsers);
  missionLoading$: Observable<boolean> = this.store.select(MissionDetailSelectors.selectMissionLoading);
  missionError$: Observable<string | null> = this.store.select(MissionDetailSelectors.selectMissionError);
  currentUserId: string | undefined = this.userService.getCurrentUser()?.id;
  isMissionCompleted$: Observable<boolean> = this.missionStatus$.pipe(map((status) => status === MissionStatus.COMPLETED));
  isMissionCanceled$: Observable<boolean> = this.missionStatus$.pipe(map((status) => status === MissionStatus.CANCELED));
  isMissionActive$: Observable<boolean> = this.missionStatus$.pipe(map((status) => status === MissionStatus.ACTIVE));
  isMissionPending$: Observable<boolean> = this.missionStatus$.pipe(map((status) => status === MissionStatus.PENDING));
  missionForm = new FormGroup({
    status: new FormControl(''),
  });
  statusChanges$ = this.missionForm.get('status')?.valueChanges.pipe(debounceTime(300), distinctUntilChanged()) || of(null);
  isMissionStatusChanging = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store<AppState>,
    private missionsService: MissionsService,
    private alertService: AlertService,
    private translateService: TranslateService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.store.dispatch(MissionDetailActions.loadMissionDetail({ id: this.missionId }));

    combineLatest([this.mission$, this.statusChanges$])
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          if (data[0]?.status) {
            this.missionForm.patchValue({ status: data[0].status }, { emitEvent: false });
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBack(): void {
    this.router.navigate(['/missions']);
  }

  onEditMission(): void {
    this.router.navigate([`/missions/edit/${this.missionId}`]);
  }

  onChangeMissionStatus(): void {
    this.isMissionStatusChanging = true;
    const newStatus = this.missionForm.get('status')?.value;

    if (!newStatus) {
      return;
    }

    this.missionsService
      .updateMissionStatus(this.missionId, newStatus)
      .pipe(
        tap(() => {
          this.store.dispatch(MissionDetailActions.updateMissionStatus({ status: newStatus }));
        }),
        switchMap(() => this.translateService.get('mission.detail.status_updated_successfully')),
        tap((message) => this.alertService.success(message)),
        catchError((err: unknown) => {
          console.error(err);
          return this.translateService.get('mission.detail.status_updated_failed').pipe(tap((message) => this.alertService.error(message)));
        })
      )
      .subscribe({
        complete: () => (this.isMissionStatusChanging = false),
      });
  }

  isUserAssignedToMission(missionUsers: User[] | undefined): boolean {
    if (!missionUsers) {
      return false;
    }

    return missionUsers.some((user) => user.id === this.currentUserId);
  }

  onAssignMeToMission(): void {
    this.missionsService
      .assignUserToMission(this.missionId, this.currentUserId!)
      .pipe(
        tap(() => {
          this.store.dispatch(MissionDetailActions.assignUserToMission());
        }),
        switchMap(() => this.translateService.get('mission.detail.user_assigned_successfully')),
        tap((message) => this.alertService.success(message)),
        catchError((err: unknown) => {
          console.error(err);
          return this.translateService.get('mission.detail.user_assigned_failed').pipe(tap((message) => this.alertService.error(message)));
        })
      )
      .subscribe();
  }

  onUnassignMeFromMission(): void {
    this.missionsService
      .unassignUserFromMission(this.missionId, this.currentUserId!)
      .pipe(
        tap(() => {
          this.store.dispatch(MissionDetailActions.unassignUserFromMission());
        }),
        switchMap(() => this.translateService.get('mission.detail.user_unassigned_successfully')),
        tap((message) => this.alertService.success(message)),
        catchError((err: unknown) => {
          console.error(err);
          return this.translateService.get('mission.detail.user_unassigned_failed').pipe(tap((message) => this.alertService.error(message)));
        })
      )
      .subscribe();
  }
}
