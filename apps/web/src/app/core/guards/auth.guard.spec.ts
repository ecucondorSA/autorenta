import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth.guard';

class AuthServiceStub {
  private authenticated = false;

  ensureSession = jasmine
    .createSpy('ensureSession')
    .and.callFake(async () => (this.authenticated ? ({ access_token: 'token' } as any) : null));

  isAuthenticated = () => this.authenticated;

  setAuthenticated(value: boolean): void {
    this.authenticated = value;
  }
}

describe('AuthGuard', () => {
  let authService: AuthServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    });

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router);
  });

  it('allows navigation when the user is authenticated', async () => {
    authService.setAuthenticated(true);
    authService.ensureSession.calls.reset();

    const result = await TestBed.runInInjectionContext(() => AuthGuard({} as any, []));

    expect(authService.ensureSession).toHaveBeenCalledTimes(1);
    expect(result).toBeTrue();
  });

  it('redirects to the login page when the user is not authenticated', async () => {
    authService.setAuthenticated(false);
    authService.ensureSession.calls.reset();

    const result = (await TestBed.runInInjectionContext(() => AuthGuard({} as any, []))) as UrlTree;

    expect(authService.ensureSession).toHaveBeenCalledTimes(1);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/auth/login');
  });
});
