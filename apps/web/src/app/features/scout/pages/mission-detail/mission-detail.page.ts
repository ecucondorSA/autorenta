import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, filter, map, Observable, Subject, takeUntil, tap } from 'rxjs';

import { AppState } from '../../../../../core/store';
import { MissionDetailActions } from '../../../../../core/store/mission-detail';
import { Mission } from '../../../../../core/store/mission-detail/mission-detail.model';
import { MissionSelectors } from '../../../../../core/store/mission-detail/mission-detail.selectors';
import { MissionService } from '../../../../../core/services/mission.service';
import { UserService } from '../../../../../core/services/user.service';
import { UserSelectors } from '../../../../../core/store/user/user.selectors';
import { User } from '../../../../../core/store/user/user.model';
import { ToastService } from '../../../../../core/services/ui/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { PhotoService } from '../../../../../core/services/photo.service';

interface FormValue {
  comment: string;
}

@Component({
  selector: 'app-mission-detail-page',
  templateUrl: './mission-detail.page.html',
  styleUrls: ['./mission-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPageComponent implements OnInit, OnDestroy {
  @Input() public missionId: string | null = null;
  @Output() public readonly back: EventEmitter<void> = new EventEmitter<void>();

  public mission$: Observable<Mission | undefined> = this.store.select(MissionSelectors.selectMission);
  public user$: Observable<User | undefined> = this.store.select(UserSelectors.selectUser);
  public form: FormGroup<{
    comment: FormControl<string | null>;
  }>;
  public mission: Mission | null = null;
  public user: User | null = null;
  public loading = false;
  public showConfirm = false;
  public confirmText = '';
  public confirmTitle = '';
  public commentPlaceholder = '';
  public missionCompletedText = '';
  public missionCompletedTitle = '';
  public missionCanceledText = '';
  public missionCanceledTitle = '';
  public missionAlreadyCompletedText = '';
  public missionAlreadyCompletedTitle = '';
  public missionAlreadyCanceledText = '';
  public missionAlreadyCanceledTitle = '';
  public missionConfirmButtonText = '';
  public missionCancelButtonText = '';
  public missionCancelConfirmButtonText = '';
  public missionCancelConfirmText = '';
  public missionCancelConfirmTitle = '';
  public missionCompleteConfirmText = '';
  public missionCompleteConfirmTitle = '';
  public missionCompleteConfirmButtonText = '';
  public missionCancelTitle = '';
  public missionCancelText = '';
  public missionCompleteTitle = '';
  public missionCompleteText = '';
  public missionCancelCommentTitle = '';
  public missionCancelCommentText = '';
  public missionCompleteCommentTitle = '';
  public missionCompleteCommentText = '';

  private destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store<AppState>,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly missionService: MissionService,
    private readonly userService: UserService,
    private readonly toastService: ToastService,
    private readonly translateService: TranslateService,
    private readonly photoService: PhotoService
  ) {
    this.form = new FormGroup({
      comment: new FormControl(''),
    });
  }

  public ngOnInit(): void {
    this.translateService
      .get([ // Changed any to string
        'MISSION_DETAIL.CONFIRM',
        'MISSION_DETAIL.MISSION_COMPLETED',
        'MISSION_DETAIL.MISSION_CANCELED',
        'MISSION_DETAIL.MISSION_ALREADY_COMPLETED',
        'MISSION_DETAIL.MISSION_ALREADY_CANCELED',
        'MISSION_DETAIL.CONFIRM_BUTTON',
        'MISSION_DETAIL.CANCEL_BUTTON',
        'MISSION_DETAIL.CANCEL_CONFIRM_BUTTON',
        'MISSION_DETAIL.CANCEL_CONFIRM',
        'MISSION_DETAIL.COMPLETE_CONFIRM',
        'MISSION_DETAIL.COMPLETE_CONFIRM_BUTTON',
        'MISSION_DETAIL.CANCEL_TITLE',
        'MISSION_DETAIL.CANCEL_TEXT',
        'MISSION_DETAIL.COMPLETE_TITLE',
        'MISSION_DETAIL.COMPLETE_TEXT',
        'MISSION_DETAIL.CANCEL_COMMENT_TITLE',
        'MISSION_DETAIL.CANCEL_COMMENT_TEXT',
        'MISSION_DETAIL.COMPLETE_COMMENT_TITLE',
        'MISSION_DETAIL.COMPLETE_COMMENT_TEXT',
        'SCOUT.COMMENT_PLACEHOLDER',
      ])
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(translations => {
        this.confirmText = translations['MISSION_DETAIL.CONFIRM'];
        this.confirmTitle = translations['MISSION_DETAIL.CONFIRM'];
        this.missionCompletedText = translations['MISSION_DETAIL.MISSION_COMPLETED'];
        this.missionCompletedTitle = translations['MISSION_DETAIL.MISSION_COMPLETED'];
        this.missionCanceledText = translations['MISSION_DETAIL.MISSION_CANCELED'];
        this.missionCanceledTitle = translations['MISSION_DETAIL.MISSION_CANCELED'];
        this.missionAlreadyCompletedText = translations['MISSION_DETAIL.MISSION_ALREADY_COMPLETED'];
        this.missionAlreadyCompletedTitle = translations['MISSION_DETAIL.MISSION_ALREADY_COMPLETED'];
        this.missionAlreadyCanceledText = translations['MISSION_DETAIL.MISSION_ALREADY_CANCELED'];
        this.missionAlreadyCanceledTitle = translations['MISSION_DETAIL.MISSION_ALREADY_CANCELED'];
        this.missionConfirmButtonText = translations['MISSION_DETAIL.CONFIRM_BUTTON'];
        this.missionCancelButtonText = translations['MISSION_DETAIL.CANCEL_BUTTON'];
        this.missionCancelConfirmButtonText = translations['MISSION_DETAIL.CANCEL_CONFIRM_BUTTON'];
        this.missionCancelConfirmText = translations['MISSION_DETAIL.CANCEL_CONFIRM'];
        this.missionCancelConfirmTitle = translations['MISSION_DETAIL.CANCEL_CONFIRM'];
        this.missionCompleteConfirmText = translations['MISSION_DETAIL.COMPLETE_CONFIRM'];
        this.missionCompleteConfirmTitle = translations['MISSION_DETAIL.COMPLETE_CONFIRM'];
        this.missionCompleteConfirmButtonText = translations['MISSION_DETAIL.COMPLETE_CONFIRM_BUTTON'];
        this.missionCancelTitle = translations['MISSION_DETAIL.CANCEL_TITLE'];
        this.missionCancelText = translations['MISSION_DETAIL.CANCEL_TEXT'];
        this.missionCompleteTitle = translations['MISSION_DETAIL.COMPLETE_TITLE'];
        this.missionCompleteText = translations['MISSION_DETAIL.COMPLETE_TEXT'];
        this.missionCancelCommentTitle = translations['MISSION_DETAIL.CANCEL_COMMENT_TITLE'];
        this.missionCancelCommentText = translations['MISSION_DETAIL.CANCEL_COMMENT_TEXT'];
        this.missionCompleteCommentTitle = translations['MISSION_DETAIL.COMPLETE_COMMENT_TITLE'];
        this.missionCompleteCommentText = translations['MISSION_DETAIL.COMPLETE_COMMENT_TEXT'];
        this.commentPlaceholder = translations['SCOUT.COMMENT_PLACEHOLDER'];
      });

    combineLatest([this.route.paramMap, this.user$])
      .pipe(
        takeUntil(this.destroy$), // unsubscribe when the component is destroyed
        filter(([params, user]) => params.has('missionId') && !!user),
        tap(([params, user]) => {
          this.missionId = params.get('missionId');
          this.user = user ?? null;

          if (this.missionId) {
            this.store.dispatch(MissionDetailActions.getMission({ id: this.missionId }));
          }
        })
      )
      .subscribe();

    this.mission$
      .pipe(
        takeUntil(this.destroy$),
        filter(mission => !!mission),
        tap(mission => {
          this.mission = mission ?? null;
        })
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onBack(): void {
    this.back.emit();
  }

  public completeMission(): void {
    if (!this.mission || !this.user) {
      return;
    }

    this.showConfirm = true;
  }

  public cancelMission(): void {
    if (!this.mission || !this.user) {
      return;
    }

    this.router.navigate([`/scout/mission-detail/${this.mission.id}/cancel`]);
  }

  public onConfirm(completed: boolean): void {
    if (!this.mission || !this.user) {
      return;
    }

    this.loading = true;

    const formValue: FormValue = this.form.value as FormValue;

    this.missionService
      .completeMission(this.mission.id, this.user.id, completed, formValue.comment)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.store.dispatch(MissionDetailActions.resetMission());
          this.store.dispatch(MissionDetailActions.removeMission({ id: this.mission?.id ?? '' }));
          this.router.navigate(['/scout']);
          this.toastService.success(this.missionCompletedText, this.missionCompletedTitle);
        },
        error: () => {
          this.loading = false;
          this.toastService.error(this.missionCanceledText, this.missionCanceledTitle);
        },
      });
  }

  public closeConfirm(): void {
    this.showConfirm = false;
  }

  public getPhoto(item: Mission): string {
    return this.photoService.getMissionPhoto(item);
  }
}
