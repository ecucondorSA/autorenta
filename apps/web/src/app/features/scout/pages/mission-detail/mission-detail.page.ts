import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../../../../store/app.state';
import { Mission } from '../../../../../core/models/mission.model';
import { selectMissionById } from '../../../../../store/mission/mission.selectors';
import { LoadMissions } from '../../../../../store/mission/mission.actions';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission | undefined>;
  missionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private store: Store<AppState>
  ) {}

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('id');

    if (this.missionId) {
      this.mission$ = this.store.select(selectMissionById(this.missionId));
    } else {
      console.error('Mission ID is null');
      this.navCtrl.back();
    }

    this.store.dispatch(LoadMissions());
  }

  goBack() {
    this.navCtrl.back();
  }

  // Example function demonstrating usage of 'any' - needs proper typing
  exampleFunction(data: any): void {
    console.log('Received data:', data);
  }

  // Example function demonstrating usage of 'any' - needs proper typing
  anotherExampleFunction(event: any): void {
    console.log('Event:', event);
  }

  trackElement(index: number, element: any): any {
    return element ? element.guid : null
  }

  handleItemClick(item: any) {
    console.log('item clicked', item)
  }

  handleButtonClick(event: any) {
    console.log('button clicked', event)
  }
}
