import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, map, switchMap, tap } from 'rxjs';

import { MissionsService } from '@core/services/missions/missions.service';
import { UserService } from '@core/services/user/user.service';
import { Mission } from '@shared/models/mission';
import { User } from '@shared/models/user';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  missionId$: Observable<string> = this.route.params.pipe(map((params) => params['missionId']));
  mission$: Observable<Mission | undefined> = this.missionId$.pipe(
    switchMap((missionId) => this.missionsService.getMission(missionId)),
    tap((mission) => {
      if (mission) {
        this.missionsService.setActiveMission(mission);
      }
    })
  );
  user$: Observable<User | undefined> = this.userService.currentUser$;
  vm$: Observable<any> = combineLatest([this.mission$, this.user$]).pipe(
    map(([mission, user]) => ({
      mission,
      user,
      isMissionOwner: mission?.userId === user?.id,
    }))
  );

  constructor(private route: ActivatedRoute, private missionsService: MissionsService, private userService: UserService) {}

  ngOnInit(): void {}

  handleError(err: unknown) {
    console.error(err);
  }

  handleSuccess(res: unknown) {
    console.log(res);
  }

  handleComplete() {
    console.log('complete');
  }

  onAssign(mission: Mission) {
    this.missionsService.assignMission(mission).subscribe({
      next: (res: any) => this.handleSuccess(res),
      error: (err: any) => this.handleError(err),
      complete: () => this.handleComplete(),
    });
  }

  onComplete(mission: Mission) {
    this.missionsService.completeMission(mission).subscribe({
      next: (res: any) => this.handleSuccess(res),
      error: (err: any) => this.handleError(err),
      complete: () => this.handleComplete(),
    });
  }

  onDelete(mission: Mission) {
    this.missionsService.deleteMission(mission).subscribe({
      next: (res: any) => this.handleSuccess(res),
      error: (err: any) => this.handleError(err),
      complete: () => this.handleComplete(),
    });
  }
}
