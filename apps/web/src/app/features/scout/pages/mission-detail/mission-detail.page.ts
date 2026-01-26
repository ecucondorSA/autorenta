import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, map, switchMap, tap } from 'rxjs';
import { MissionsService } from '../../services/missions.service';
import { Mission } from '../../models/mission';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../../../auth/store/auth.selectors';
import { User } from '../../../../auth/models/user';
import { AutoRentaService } from '@core/services/auto-renta.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  missionId$: Observable<string> = this.route.params.pipe(map((params) => params['id']));
  mission$: Observable<Mission> = this.missionId$.pipe(switchMap((id) => this.missionsService.getMission(id)));
  user$: Observable<User | null> = this.store.select(selectAuthUser);
  vm$: Observable<any>;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private store: Store,
    private autoRentaService: AutoRentaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([this.mission$, this.user$]).pipe(
      map(([mission, user]) => ({
        mission,
        user,
      }))
    );
  }

  onRent(mission: Mission) {
    if (!mission?.car?.id) return;

    this.autoRentaService.rentCar(mission.car.id).subscribe({
      next: (/*res: any*/) => {
        this.snackBar.open(`You have rented ${mission.car.model} successfully!`, 'OK', {
          duration: 3000,
        });
      },
      error: (/*err: any*/) => {
        this.snackBar.open(`Ups, something went wrong!`, 'OK', {
          duration: 3000,
        });
      },
    });
  }

  onReturn(mission: Mission) {
    if (!mission?.car?.id) return;

    this.autoRentaService.returnCar(mission.car.id).subscribe({
      next: (/*_res: any*/) => {
        this.snackBar.open(`You have returned ${mission.car.model} successfully!`, 'OK', {
          duration: 3000,
        });
      },
      error: (/*_err: any*/) => {
        this.snackBar.open(`Ups, something went wrong!`, 'OK', {
          duration: 3000,
        });
      },
    });
  }

  onContactSupport(mission: Mission) {
    console.log('Contacting support for mission:', mission);
    // Implement your contact support logic here
  }

  getMapUrl(mission: Mission): string {
    const latitude = mission?.location?.latitude || 0;
    const longitude = mission?.location?.longitude || 0;
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  openMap(mission: Mission) {
    window.open(this.getMapUrl(mission), '_blank');
  }
}
