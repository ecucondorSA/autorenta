import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MissionsService } from '@core/services/missions/missions.service';
import { Mission } from '@core/models/mission.model';
import { NavController } from '@ionic/angular';
import { ScoutService } from '@core/services/scout/scout.service';
import { Car } from '@core/models/car.model';
import { finalize } from 'rxjs/operators';
import { AlertService } from '@core/services/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission: Mission | null = null;
  missionId: string | null = null;
  isLoading = false;
  cars: Car[] = [];
  selectedCar: Car | null = null;

  constructor(
    private route: ActivatedRoute,
    private missionsService: MissionsService,
    private navCtrl: NavController,
    private scoutService: ScoutService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('id');
    if (this.missionId) {
      this.loadMission(this.missionId);
    }
  }

  loadMission(missionId: string) {
    this.isLoading = true;
    this.missionsService
      .getMission(missionId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(
        (mission) => {
          this.mission = mission;
          this.loadCars(missionId);
        },
        (error) => {
          console.error('Error fetching mission:', error);
          this.navCtrl.back();
        }
      );
  }

  loadCars(missionId: string) {
    this.isLoading = true;
    this.scoutService
      .getCarsForMission(missionId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(
        (cars) => {
          this.cars = cars;
        },
        (error) => {
          console.error('Error fetching cars:', error);
        }
      );
  }

  onCarSelected(car: Car) {
    this.selectedCar = car;
  }

  async assignCarToMission() {
    if (!this.selectedCar || !this.missionId) {
      return;
    }

    this.isLoading = true;
    try {
      await this.scoutService.assignCarToMission(this.selectedCar.id, this.missionId).toPromise();
      this.alertService.showToast(this.translate.instant('MISSION.CAR_ASSIGNED_SUCCESSFULLY'));
      this.navCtrl.back();
    } catch (error: any) {
      console.error('Error assigning car to mission:', error);
      this.alertService.showToast(this.translate.instant('MISSION.CAR_ASSIGNED_FAILED'));
    } finally {
      this.isLoading = false;
    }
  }

  async removeCarFromMission(car: Car) {
    if (!this.missionId) {
      return;
    }

    this.isLoading = true;
    try {
      await this.scoutService.removeCarFromMission(car.id, this.missionId).toPromise();
      this.alertService.showToast(this.translate.instant('MISSION.CAR_REMOVED_SUCCESSFULLY'));
      this.loadCars(this.missionId);
    } catch (error: any) {
      console.error('Error removing car from mission:', error);
      this.alertService.showToast(this.translate.instant('MISSION.CAR_REMOVED_FAILED'));
    } finally {
      this.isLoading = false;
    }
  }

  getMissionStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'medium';
    }
  }
}
