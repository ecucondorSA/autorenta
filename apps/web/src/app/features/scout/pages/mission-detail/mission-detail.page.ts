import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Mission } from '../../../../../core/models/mission';
import { loadMission } from '../../../../../core/store/mission/mission.actions';
import { selectCurrentMission } from '../../../../../core/store/mission/mission.selectors';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-mission-detail',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
})
export class MissionDetailPage implements OnInit {
  mission$: Observable<Mission | undefined>;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translocoService: TranslocoService
  ) {}

  ngOnInit() {
    this.mission$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const missionId = params.get('missionId');
        if (missionId) {
          this.store.dispatch(loadMission({ missionId }));
        }
        return this.store.select(selectCurrentMission);
      })
    );
  }

  openDialog() {
    this.dialog.open(MissionDialog);
  }

  showSnackbar() {
    this.snackBar.open(this.translocoService.translate('missionDetail.snackbarMessage'), 'OK', {
      duration: 3000,
    });
  }

  handleError = (_res: any, err: any) => {
    // TODO: Implement error handling
    console.error(err);
  };
}

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'mission-dialog',
  template: `<h1 mat-dialog-title>Confirm Mission Completion</h1>
<div mat-dialog-content>Are you sure you want to mark this mission as complete?</div>
<div mat-dialog-actions>
  <button mat-button mat-dialog-close>Cancel</button>
  <button mat-button [mat-dialog-close]="true" cdkFocusInitial>Ok</button>
</div>`,
})
export class MissionDialog {
  constructor(
    public dialogRef: MatDialogRef<MissionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
