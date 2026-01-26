import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@core/services/api/api.service';
import { Mission } from '@shared/interfaces/mission';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission: Mission | null = null;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const missionId = params['id'];
      this.loadMissionDetails(missionId);
    });
  }

  loadMissionDetails(missionId: string) {
    this.apiService.getMission(missionId).subscribe(
      (mission) => {
        this.mission = mission;
      },
      (error) => {
        console.error('Error loading mission details:', error);
      }
    );
  }

  async completeMission() {
    if (this.mission) {
      try {
        await this.apiService.completeMission(this.mission.id).toPromise();
        // Optionally, navigate back or show a success message
        console.log('Mission completed successfully!');
      } catch (error: any) {
        console.error('Failed to complete mission:', error);
      }
    }
  }

  async failMission() {
    if (this.mission) {
      try {
        await this.apiService.failMission(this.mission.id).toPromise();
        console.log('Mission failed successfully!');
      } catch (error: any) {
        console.error('Failed to fail mission:', error);
      }
    }
  }

  async resetMission() {
    if (this.mission) {
      try {
        await this.apiService.resetMission(this.mission.id).toPromise();
        console.log('Mission reset successfully!');
      } catch (error: any) {
        console.error('Failed to reset mission:', error);
      }
    }
  }

  // Example function to handle a button click
  handleButtonClick(event: any) {
    // Access the event target
    const target = event.target;

    // Check if the target is an HTML element
    if (target instanceof HTMLElement) {
      // Access the data-action attribute
      const action = target.dataset['action'];

      // Perform actions based on the data-action value
      if (action === 'complete') {
        this.completeMission();
      } else if (action === 'fail') {
        this.failMission();
      } else if (action === 'reset') {
        this.resetMission();
      } else {
        console.log('No action to perform.');
      }
    }
  }
}
