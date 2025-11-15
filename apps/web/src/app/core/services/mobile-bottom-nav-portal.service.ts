import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  ComponentRef,
} from '@angular/core';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Injectable({ providedIn: 'root' })
export class MobileBottomNavPortalService {
  private componentRef?: ComponentRef<MobileBottomNavComponent>;
  private readonly isBrowser = typeof document !== 'undefined';

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

    this.appRef.attachView(this.componentRef.hostView);
    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.classList.add('mobile-bottom-nav-portal');
    document.body.appendChild(element);
  }

  destroy(): void {
    if (!this.componentRef || !this.isBrowser) {
      return;
    }

    const element = this.componentRef.location.nativeElement as HTMLElement;
    element.remove();

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = undefined;
  }
}
