import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  ComponentRef,
} from '@angular/core';
import { Subject, Observable, Subscription } from 'rxjs';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Injectable({ providedIn: 'root' })
export class MobileBottomNavPortalService {
  private componentRef?: ComponentRef<MobileBottomNavComponent>;
  private readonly isBrowser = typeof document !== 'undefined';
  private menuOpenSubscription?: Subscription;

  private readonly menuOpenSubject = new Subject<void>();
  readonly menuOpen$: Observable<void> = this.menuOpenSubject.asObservable();

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
    this.menuOpenSubscription = this.componentRef.instance.menuOpen.subscribe(() => {
      this.menuOpenSubject.next();
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

    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.remove();

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = undefined;
  }
}
