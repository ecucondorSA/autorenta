import { TestBed } from '@angular/core/testing';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

const createSession = (id: string): Session => ({
  access_token: `access-${id}`,
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: `refresh-${id}`,
  user: {
    id,
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    email: `${id}@autorenta.test`,
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    identities: [],
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    phone: '',
    role: 'authenticated',
    updated_at: '2024-01-01T00:00:00.000Z',
    factors: [],
    user_metadata: {},
  },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  provider_token: null,
  provider_refresh_token: null,
});

describe('AuthService', () => {
  let authCallbacks: AuthCallback | undefined;
  let supabaseAuthMock: {
    getSession: jasmine.Spy<() => Promise<{ data: { session: Session | null }; error: null }>>;
    onAuthStateChange: jasmine.Spy<
      (callback: AuthCallback) => { data: { subscription: { unsubscribe: () => void } } }
    >;
    signUp: jasmine.Spy;
    signInWithPassword: jasmine.Spy;
    signOut: jasmine.Spy;
    resetPasswordForEmail: jasmine.Spy;
  };
  let supabaseMock: { auth: typeof supabaseAuthMock };

  const initService = async (): Promise<AuthService> => {
    const instance = TestBed.inject(AuthService);
    await instance.ensureSession();
    return instance;
  };

  beforeEach(() => {
    authCallbacks = undefined;
    const unsubscribe = () => undefined;

    supabaseAuthMock = {
      getSession: jasmine
        .createSpy('getSession')
        .and.resolveTo({ data: { session: null }, error: null }),
      onAuthStateChange: jasmine
        .createSpy('onAuthStateChange')
        .and.callFake((callback: AuthCallback) => {
          authCallbacks = callback;
          return { data: { subscription: { unsubscribe } } };
        }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ data: {}, error: null }),
      signInWithPassword: jasmine
        .createSpy('signInWithPassword')
        .and.resolveTo({ data: {}, error: null }),
      signOut: jasmine.createSpy('signOut').and.resolveTo({ error: null }),
      resetPasswordForEmail: jasmine
        .createSpy('resetPasswordForEmail')
        .and.resolveTo({ data: {}, error: null }),
    };

    supabaseMock = { auth: supabaseAuthMock };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });
  });

  it('restores the session on initialization', async () => {
    const session = createSession('user-1');
    supabaseAuthMock.getSession.and.resolveTo({ data: { session }, error: null });

    const service = await initService();

    expect(supabaseAuthMock.getSession).toHaveBeenCalledTimes(1);
    expect(service.sessionSignal()).toBe(session);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.loading()).toBeFalse();
  });

  it('returns the cached session once loaded', async () => {
    const session = createSession('cached');
    supabaseAuthMock.getSession.and.resolveTo({ data: { session }, error: null });

    const service = await initService();
    await service.ensureSession();

    expect(supabaseAuthMock.getSession).toHaveBeenCalledTimes(1);
    expect(service.sessionSignal()).toBe(session);
  });

  it('listens to auth state changes and updates the session signal', async () => {
    const service = await initService();
    expect(authCallbacks).toBeDefined();

    const newSession = createSession('user-2');
    authCallbacks?.('SIGNED_IN', newSession);

    expect(service.sessionSignal()).toBe(newSession);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('includes metadata on sign up', async () => {
    const service = await initService();

    await service.signUp('nuevo@autorenta.test', 'securePass123', 'Juan Pérez');

    expect(supabaseAuthMock.signUp).toHaveBeenCalledWith({
      email: 'nuevo@autorenta.test',
      password: 'securePass123',
      options: {
        data: {
          full_name: 'Juan Pérez',
          default_currency: environment.defaultCurrency,
        },
      },
    });
  });

  it('maps network errors to a friendly message on sign in', async () => {
    const service = await initService();
    const networkError = new Error('Failed to fetch datos');
    supabaseAuthMock.signInWithPassword.and.resolveTo({ data: null, error: networkError });

    await expectAsync(service.signIn('user@autorenta.test', 'pass123')).toBeRejectedWithError(
      'No se pudo contactar con Supabase. Verifica tu conexión y las variables NG_APP_SUPABASE_URL / NG_APP_SUPABASE_ANON_KEY.',
    );
  });

  it('propagates Supabase errors for other scenarios', async () => {
    const service = await initService();
    const supabaseError = new Error('Invalid credentials');
    supabaseAuthMock.signOut.and.resolveTo({ error: supabaseError });

    await expectAsync(service.signOut()).toBeRejectedWith(supabaseError);
  });
});
