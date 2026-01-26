import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { MissionsService } from '../../../../core/services/missions.service';
import { Mission } from '../../../../core/models/mission.model';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss']
})
export class MissionDetailPage implements OnInit {
  mission: Mission | undefined;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          return this.missionsService.getMission(id);
        } else {
          // Handle the case where 'id' is null
          return Promise.resolve(null);
        }
      })
    ).subscribe(mission => {
      this.mission = mission as Mission; // Type assertion here
    });
  }

}