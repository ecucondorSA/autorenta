import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { ApiService } from '@core/services/api/api.service';
import { Store } from '@ngrx/store';
import { AppState } from '@store/app.state';
import { setHeaderOption } from '@store/header/header.actions';
import { HeaderOptions } from '@store/header/header.state';
import { Mission } from '@models/mission';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission | undefined> = of(undefined);

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private api: ApiService,
    private store: Store<AppState>
  ) {}

  ngOnInit() {
    this.mission$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (id) {
          return this.api.getMission(id);
        }
        return of(undefined);
      })
    );

    this.store.dispatch(setHeaderOption({ option: HeaderOptions.back }));
  }

  async completeMission() {
    this.mission$.subscribe((mission) => {
      if (mission?.id) {
        this.api.completeMission(mission.id).subscribe({
          next: () => {
            this.navCtrl.back();
          },
          error: (err) => {
            console.error(err);
          },
        });
      }
    });
  }

  async abandonMission() {
    this.mission$.subscribe((mission) => {
      if (mission?.id) {
        this.api.abandonMission(mission.id).subscribe({
          next: () => {
            this.navCtrl.back();
          },
          error: (err) => {
            console.error(err);
          },
        });
      }
    });
  }

  getRewardText(reward: any): string {
    if (reward?.amount && reward?.currency) {
      return `${reward.amount} ${reward.currency}`;
    }
    return 'N/A';
  }

  getRewardDescription(reward: any): string {
    return reward?.description || 'No description';
  }

  getFineText(fine: any): string {
    if (fine?.amount && fine?.currency) {
      return `${fine.amount} ${fine.currency}`;
    }
    return 'N/A';
  }

  getFineDescription(fine: any): string {
    return fine?.description || 'No description';
  }
}
