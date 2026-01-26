import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@core/services/api/api.service';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  missionId: string | null = null;
  mission: any;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('id');
    if (this.missionId) {
      this.loadMissionDetails(this.missionId);
    }
  }

  async loadMissionDetails(missionId: string) {
    try {
      this.mission = await this.apiService.get(`/missions/${missionId}`);
    } catch (error) {
      console.error('Failed to load mission details:', error);
    }
  }

  async completeMission() {
    if (!this.missionId) return;
    try {
      await this.apiService.post(`/missions/${this.missionId}/complete`, {});
      // Handle successful completion (e.g., show a success message, redirect)
      console.log('Mission completed successfully!');
    } catch (error) {
      console.error('Failed to complete mission:', error);
    }
  }

  async failMission() {
    if (!this.missionId) return;
    try {
      await this.apiService.post(`/missions/${this.missionId}/fail`, {});
      // Handle mission failure (e.g., show a failure message, redirect)
      console.log('Mission failed.');
    } catch (error) {
      console.error('Failed to fail mission:', error);
    }
  }

  handleImageError(event: any) {
    event.target.src = 'assets/img/fallback-image.png';
  }

  async submitEvidence(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('evidence', file);

    try {
      const response: any = await this.apiService.post(
        `/missions/${this.missionId}/submit-evidence`,
        formData
      );
      console.log('Evidence submitted:', response);
    } catch (_err: any) {
      console.error('Failed to submit evidence:', _err);
    }
  }

  async getMissionResult() {
    try {
      const response: any = await this.apiService.get(
        `/missions/${this.missionId}/result`
      );
      console.log('Mission result:', response);
    } catch (_err: any) {
      console.error('Failed to get mission result:', _err);
    }
  }
}
