import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, map, switchMap, take } from 'rxjs';
import { Mission } from '../../../../../core/models/mission';
import { MissionsService } from '../../../../../core/services/missions/missions.service';
import { UserService } from '../../../../../core/services/user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteMissionDialogComponent } from '../../components/delete-mission-dialog/delete-mission-dialog.component';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../../../../core/store/auth/auth.selectors';
import { User } from '../../../../../core/models/user';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission | undefined>;
  isOwner$: Observable<boolean>;
  missionId: string;
  user$ = this.store.select(selectAuthUser);

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog,
    private store: Store,
    private snackBar: MatSnackBar,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.mission$ = this.route.params.pipe(
      switchMap((params) => {
        this.missionId = params['id'];
        return this.missionsService.getMission(params['id']);
      })
    );

    this.isOwner$ = combineLatest([this.mission$, this.user$]).pipe(
      map(([mission, user]) => {
        if (!mission || !user) {
          return false;
        }
        return mission.owner === user.uid;
      })
    );
  }

  async takeMission(mission: Mission) {
    const user = await this.userService.getUser();

    if (!user) {
      return;
    }

    if (mission.takenBy) {
      return;
    }

    this.missionsService
      .takeMission(mission.id, user.uid)
      .then(() => {
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_taken'),
          'OK',
          {
            duration: 3000,
          }
        );
      })
      .catch((error) => {
        console.error('Error taking mission:', error);
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_taken_error'),
          'OK',
          {
            duration: 3000,
          }
        );
      });
  }

  openDeleteMissionDialog(mission: Mission) {
    const dialogRef = this.dialog.open(DeleteMissionDialogComponent, {
      width: '250px',
      data: { missionId: mission.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.router.navigate(['/scout']);
      }
    });
  }

  async completeMission(mission: Mission) {
    if (!mission.takenBy) {
      return;
    }

    this.missionsService
      .completeMission(mission.id)
      .then(() => {
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_completed'),
          'OK',
          {
            duration: 3000,
          }
        );
        this.router.navigate(['/scout']);
      })
      .catch((error) => {
        console.error('Error completing mission:', error);
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_completed_error'),
          'OK',
          {
            duration: 3000,
          }
        );
      });
  }

  async abandonMission(mission: Mission) {
    if (!mission.takenBy) {
      return;
    }

    this.missionsService
      .abandonMission(mission.id)
      .then(() => {
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_abandoned'),
          'OK',
          {
            duration: 3000,
          }
        );
      })
      .catch((error) => {
        console.error('Error abandoning mission:', error);
        this.snackBar.open(
          this.translocoService.translate('mission_detail.mission_abandoned_error'),
          'OK',
          {
            duration: 3000,
          }
        );
      });
  }
}
