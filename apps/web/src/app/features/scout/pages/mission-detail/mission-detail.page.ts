import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { Mission } from '../../../../core/models/mission';
import { MissionsService } from '../../../../core/services/missions.service';
import { MatDialog } from '@angular/material/dialog';
import { MissionReportDialogComponent } from '../../components/mission-report-dialog/mission-report-dialog.component';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../../../core/store/auth/auth.selectors';
import { User } from '../../../../core/models/user';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission>;
  user$: Observable<User | null>;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private dialog: MatDialog,
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.mission$ = this.route.params.pipe(
      switchMap((params) => this.missionsService.getMission(params['id']))
    );

    this.user$ = this.store.select(selectAuthUser);
  }

  openReportDialog(mission: Mission): void {
    this.user$.subscribe(user => {
      if (!user) {
        this.snackBar.open('You must be logged in to report a mission', 'Close', { duration: 3000 });
        return;
      }

      const dialogRef = this.dialog.open(MissionReportDialogComponent, {
        width: '500px',
        data: { mission, userId: user.id },
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // TODO: Handle the report result
        }
      });
    });
  }

  getVehicleImage(mission: Mission): string {
    // TODO: Replace any with the correct type
    const vehicleTypeMapping: { [key: string]: string } = {
      "Truck": "truck",
      "SUV": "suv",
      "Sedan": "sedan",
      "Convertible": "convertible",
      "Sports Car": "sports",
      "Van": "van"
    };

    const vehicleType = mission.vehicle.vehicleType || "Sedan";
    const imageName = vehicleTypeMapping[vehicleType] || "sedan";
    return `/assets/img/icons/vehicles/${imageName}.svg`;
  }

  getBadgeColor(mission: Mission): string {
    // TODO: Replace any with the correct type
    const statusColorMapping: { [key: string]: string } = {
      "available": "success",
      "inProgress": "warning",
      "completed": "primary",
      "cancelled": "danger"
    };

    const status = mission.status || "available";
    return statusColorMapping[status] || "primary";
  }

  getBadgeIcon(mission: Mission): string {
    // TODO: Replace any with the correct type
    const statusIconMapping: { [key: string]: string } = {
      "available": "checkmark-circle-outline",
      "inProgress": "sync-outline",
      "completed": "checkmark-circle-outline",
      "cancelled": "close-circle-outline"
    };

    const status = mission.status || "available";
    return statusIconMapping[status] || "checkmark-circle-outline";
  }

  getBadgeLabel(mission: Mission): string {
    // TODO: Replace any with the correct type
    const statusLabelMapping: { [key: string]: string } = {
      "available": "Available",
      "inProgress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    };

    const status = mission.status || "available";
    return statusLabelMapping[status] || "Available";
  }

  getRewardLabel(mission: Mission): string {
    // TODO: Replace any with the correct type
    const rewardTypeMapping: { [key: string]: string } = {
      "cash": "Cash",
      "points": "Points",
      "experience": "Experience"
    };

    const rewardType = mission.reward.type || "cash";
    return rewardTypeMapping[rewardType] || "Cash";
  }

  getRewardIcon(mission: Mission): string {
    // TODO: Replace any with the correct type
    const rewardIconMapping: { [key: string]: string } = {
      "cash": "cash",
      "points": "star",
      "experience": "arrow-up-circle"
    };

    const rewardType = mission.reward.type || "cash";
    return rewardIconMapping[rewardType] || "cash";
  }
}
