import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { MissionsService } from '../../services/missions.service';
import { Mission } from '../../models/mission';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission | undefined> = this.route.params.pipe(
    switchMap((params) => this.missionsService.getMission(params['id']))
  );

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService
  ) {}

  ngOnInit(): void {}

  getBadgeType(mission: Mission | undefined): string {
    if (!mission) {
      return '';
    }

    if (mission.status === 'available') {
      return 'success';
    }

    if (mission.status === 'inProgress') {
      return 'warning';
    }

    return 'error';
  }

  getBadgeIcon(mission: Mission | undefined): string {
    if (!mission) {
      return '';
    }

    if (mission.status === 'available') {
      return 'checkmark-circle-outline';
    }

    if (mission.status === 'inProgress') {
      return 'sync-outline';
    }

    return 'close-circle-outline';
  }

  getBadgeColor(mission: Mission | undefined): string {
    if (!mission) {
      return '';
    }

    if (mission.status === 'available') {
      return 'success';
    }

    if (mission.status === 'inProgress') {
      return 'warning';
    }

    return 'danger';
  }

  getMissionStatusText(mission: Mission | undefined): string {
    if (!mission) {
      return '';
    }

    if (mission.status === 'available') {
      return 'Available';
    }

    if (mission.status === 'inProgress') {
      return 'In Progress';
    }

    return 'Completed';
  }

  getMissionStatusColor(mission: Mission | undefined): string {
    if (!mission) {
      return '';
    }

    if (mission.status === 'available') {
      return 'success';
    }

    if (mission.status === 'inProgress') {
      return 'warning';
    }

    return 'danger';
  }
}
