import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MissionsService } from '@core/api/services';
import { Mission } from '@core/api/models';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission: Mission | null = null;
  missionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private navController: NavController
  ) {}

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('missionId');
    if (this.missionId) {
      this.missionsService.getMissionById({
        id: this.missionId
      }).subscribe(
        (mission) => {
          this.mission = mission;
        },
        (error) => {
          console.error('Error fetching mission:', error);
          this.navController.back();
        }
      );
    }
  }

  getChecklistValue(item: any): string {
    if (!item || !item.name || !item.value) {
      return 'N/A';
    }

    if (typeof item.value === 'boolean') {
      return item.value ? 'Yes' : 'No';
    }

    return item.value;
  }

  getChecklistColor(item: any): string {
    if (!item || !item.name || !item.value) {
      return 'medium';
    }

    if (typeof item.value === 'boolean') {
      return item.value ? 'success' : 'danger';
    }

    return 'primary';
  }

  getChecklistIcon(item: any): string {
     if (!item || !item.name || !item.value) {
      return 'help-outline';
    }

    if (typeof item.value === 'boolean') {
      return item.value ? 'checkmark-circle-outline' : 'close-circle-outline';
    }

    return 'information-circle-outline';
  }

  getChecklistLabel(item: any): string {
    if (!item || !item.name) {
      return 'N/A';
    }
    return item.name;
  }

  getPhotoUrl(photo: any): string {
    if (!photo || !photo.url) {
      return 'N/A';
    }
    return photo.url;
  }

  openPhoto(photo: any) {
    if (photo && photo.url) {
      window.open(photo.url, '_blank');
    }
  }

  getFormattedDate(date: any): string {
    try {
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  }

  getFormattedTime(date: any): string {
    try {
      return new Date(date).toLocaleTimeString();
    } catch (e) {
      return 'N/A';
    }
  }

  goBack() {
    this.navController.back();
  }
}
