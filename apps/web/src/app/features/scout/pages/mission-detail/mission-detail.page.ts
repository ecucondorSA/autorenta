import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap, take, tap } from 'rxjs';

import { MissionsService } from '@core/services/missions/missions.service';
import { UserService } from '@core/services/user/user.service';
import { Mission } from '@shared/models/mission';
import { User } from '@shared/models/user';
import { Marker } from '@shared/models/marker';
import { MarkersService } from '@core/services/markers/markers.service';
import { FormControl } from '@angular/forms';
import { ToastService } from '@shared/services/toast.service';
import { TranslocoService } from '@ngneat/transloco';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  missionId: string = this.route.snapshot.params['id'];
  mission$: Observable<Mission | undefined> = this.missionsService.getMission(this.missionId);
  markers$: Observable<Marker[]> = this.markersService.getMissionMarkers(this.missionId);
  user$: Observable<User | null> = this.userService.currentUser$;
  isMissionCreator$: Observable<boolean> = combineLatest([this.mission$, this.user$]).pipe(
    map(([mission, user]) => mission?.creator === user?.uid)
  );
  isMissionMember$: Observable<boolean> = combineLatest([this.mission$, this.user$]).pipe(
    map(([mission, user]) => mission?.members?.includes(user?.uid ?? '') ?? false)
  );
  canEditMission$: Observable<boolean> = combineLatest([this.isMissionCreator$, this.isMissionMember$]).pipe(
    map(([isCreator, isMember]) => isCreator || isMember)
  );
  missionNameControl: FormControl = new FormControl();
  isSavingName: boolean = false;
  mapTileUrl = environment.mapTileUrl;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private markersService: MarkersService,
    private userService: UserService,
    private router: Router,
    private toastService: ToastService,
    private translocoService: TranslocoService
  ) {}

  ngOnInit() {
    this.mission$
      .pipe(
        take(1),
        tap((mission) => {
          this.missionNameControl.setValue(mission?.name);
        })
      )
      .subscribe();
  }

  async joinMission() {
    this.user$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) {
            this.toastService.error(this.translocoService.translate('missionDetail.toasts.notLoggedIn'));
            return of(null);
          }
          return this.missionsService.joinMission(this.missionId, user.uid);
        })
      )
      .subscribe();
  }

  async leaveMission() {
    this.user$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) {
            this.toastService.error(this.translocoService.translate('missionDetail.toasts.notLoggedIn'));
            return of(null);
          }
          return this.missionsService.leaveMission(this.missionId, user.uid);
        })
      )
      .subscribe();
  }

  async deleteMission() {
    this.missionsService
      .deleteMission(this.missionId)
      .then(() => {
        this.router.navigate(['/scout']);
      })
      .catch((_err: unknown) => {
        this.toastService.error(this.translocoService.translate('missionDetail.toasts.deleteError'));
      });
  }

  async saveMissionName() {
    if (this.missionNameControl.invalid) return;
    this.isSavingName = true;
    this.missionsService
      .updateMission(this.missionId, { name: this.missionNameControl.value })
      .catch((_res: unknown) => {
        this.toastService.error(this.translocoService.translate('missionDetail.toasts.saveNameError'));
      })
      .finally(() => {
        this.isSavingName = false;
      });
  }

  markerClick(marker: Marker) {
    this.router.navigate(['/scout/marker', marker.id]);
  }

  trackMarkers(index: number, marker: Marker): string {
    return marker.id;
  }

  async addMarker(event: any) {
    const position = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    this.router.navigate(['/scout/marker/create'], { queryParams: position });
  }
}
