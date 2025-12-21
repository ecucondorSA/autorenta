import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  ComponentRef,
  inject,
  DestroyRef,
} from '@angular/core';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MobileBottomNavComponent } from '@shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Injectable({ providedIn: 'root' })
export class MobileBottomNavPortalService {
  private componentRef?: ComponentRef<MobileBottomNavComponent>;
  private readonly isBrowser = typeof document !== 'undefined';
  private menuOpenSubscription?: Subscription;
  private rentarfastOpenSubscription?: Subscription;
  private readonly destroyRef = inject(DestroyRef);

  private readonly menuOpenSubject = new Subject<void>();
  readonly menuOpen$: Observable<void> = this.menuOpenSubject.asObservable();

  private readonly rentarfastOpenSubject = new Subject<void>();
  readonly rentarfastOpen$: Observable<void> = this.rentarfastOpenSubject.asObservable();

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly environmentInjector: EnvironmentInjector,
  ) {}

  create(): void {
    if (!this.isBrowser || this.componentRef) {
      return;
    }

    this.componentRef = createComponent(MobileBottomNavComponent, {
      environmentInjector: this.environmentInjector,
    });

    // Subscribe to the component's menuOpen event
    this.menuOpenSubscription = this.componentRef.instance.menuOpen
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.menuOpenSubject.next();
      });

    // Subscribe to the component's rentarfastOpen event
    this.rentarfastOpenSubscription = this.componentRef.instance.rentarfastOpen
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.rentarfastOpenSubject.next();
      });

    this.appRef.attachView(this.componentRef.hostView);
    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.classList.add('mobile-bottom-nav-portal');
    document.body.appendChild(element);
  }

  destroy(): void {
    if (!this.componentRef || !this.isBrowser) {
      return;
    }

    this.menuOpenSubscription?.unsubscribe();
    this.menuOpenSubscription = undefined;

    this.rentarfastOpenSubscription?.unsubscribe();
    this.rentarfastOpenSubscription = undefined;

    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.remove();

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = undefined;
  }

  setHidden(hidden: boolean): void {
    if (!this.componentRef || !this.isBrowser) {
      return;
    }

    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.classList.toggle('hidden', hidden);
  }
}
