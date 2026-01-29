/**
 * SharedTestingModule
 *
 * Provides common mocks for unit tests to reduce boilerplate
 * and ensure consistent test configuration across the app.
 *
 * Usage:
 * ```typescript
 * import { SharedTestingModule, mockSupabaseClientService } from '@testing/testing.module';
 *
 * beforeEach(async () => {
 *   await TestBed.configureTestingModule({
 *     imports: [SharedTestingModule],
 *     providers: [
 *       { provide: SupabaseClientService, useValue: mockSupabaseClientService() }
 *     ]
 *   }).compileComponents();
 * });
 * ```
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * Create a mock SupabaseClientService
 * Provides all common methods used in the app
 */
export function mockSupabaseClientService() {
  const mockAuthSession = {
    data: { session: null, user: null },
    error: null,
  };

  const mockAuthUser = {
    data: { user: null },
    error: null,
  };

  const mockSubscription = {
    data: {
      subscription: {
        unsubscribe: jasmine.createSpy('unsubscribe'),
      },
    },
  };

  const createChainableQuery = () => {
    const query: Record<string, unknown> = {};
    const methods = [
      'select',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'like',
      'ilike',
      'in',
      'is',
      'order',
      'limit',
      'range',
      'or',
      'and',
      'filter',
      'match',
      'not',
      'insert',
      'update',
      'upsert',
      'delete',
    ];

    methods.forEach((method) => {
      query[method] = jasmine.createSpy(method).and.returnValue(query);
    });

    query['single'] = jasmine
      .createSpy('single')
      .and.returnValue(Promise.resolve({ data: null, error: null }));
    query['maybeSingle'] = jasmine
      .createSpy('maybeSingle')
      .and.returnValue(Promise.resolve({ data: null, error: null }));
    query['then'] = (resolve: (value: unknown) => void) => {
      resolve({ data: [], error: null, count: 0 });
      return Promise.resolve({ data: [], error: null, count: 0 });
    };

    return query;
  };

  return {
    isConfigured: true,
    getClient: jasmine.createSpy('getClient').and.returnValue({
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve(mockAuthSession)),
        getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve(mockAuthUser)),
        onAuthStateChange: jasmine
          .createSpy('onAuthStateChange')
          .and.returnValue(mockSubscription),
        signInWithPassword: jasmine
          .createSpy('signInWithPassword')
          .and.returnValue(Promise.resolve(mockAuthSession)),
        signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve({ error: null })),
        signUp: jasmine.createSpy('signUp').and.returnValue(Promise.resolve(mockAuthSession)),
        resetPasswordForEmail: jasmine
          .createSpy('resetPasswordForEmail')
          .and.returnValue(Promise.resolve({ data: {}, error: null })),
        updateUser: jasmine
          .createSpy('updateUser')
          .and.returnValue(Promise.resolve(mockAuthUser)),
      },
      from: jasmine.createSpy('from').and.callFake(() => createChainableQuery()),
      rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
      storage: {
        from: jasmine.createSpy('storageFrom').and.returnValue({
          upload: jasmine
            .createSpy('upload')
            .and.returnValue(Promise.resolve({ data: { path: 'test-path' }, error: null })),
          getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
            data: { publicUrl: 'https://test-url.com/image.jpg' },
          }),
          download: jasmine
            .createSpy('download')
            .and.returnValue(Promise.resolve({ data: new Blob(), error: null })),
          remove: jasmine
            .createSpy('remove')
            .and.returnValue(Promise.resolve({ data: [], error: null })),
          list: jasmine
            .createSpy('list')
            .and.returnValue(Promise.resolve({ data: [], error: null })),
        }),
      },
      channel: jasmine.createSpy('channel').and.returnValue({
        on: jasmine.createSpy('on').and.returnValue({
          subscribe: jasmine.createSpy('subscribe').and.returnValue({
            unsubscribe: jasmine.createSpy('unsubscribe'),
          }),
        }),
        subscribe: jasmine.createSpy('subscribe').and.returnValue({
          unsubscribe: jasmine.createSpy('unsubscribe'),
        }),
      }),
      removeChannel: jasmine.createSpy('removeChannel'),
    }),
  };
}

/**
 * Create a mock AuthService
 */
export function mockAuthService() {
  return {
    currentUser: jasmine.createSpy('currentUser').and.returnValue(null),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    isLoading: jasmine.createSpy('isLoading').and.returnValue(false),
    login: jasmine.createSpy('login').and.returnValue(Promise.resolve({ success: true })),
    logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
    register: jasmine.createSpy('register').and.returnValue(Promise.resolve({ success: true })),
  };
}

/**
 * Create a mock LoggerService
 */
export function mockLoggerService() {
  return {
    debug: jasmine.createSpy('debug'),
    info: jasmine.createSpy('info'),
    warn: jasmine.createSpy('warn'),
    error: jasmine.createSpy('error'),
    critical: jasmine.createSpy('critical'),
    createChildLogger: jasmine.createSpy('createChildLogger').and.returnValue({
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
      critical: jasmine.createSpy('critical'),
    }),
  };
}

/**
 * Create a mock AnalyticsService
 */
export function mockAnalyticsService() {
  return {
    trackEvent: jasmine.createSpy('trackEvent'),
    trackPageView: jasmine.createSpy('trackPageView'),
    setUserProperties: jasmine.createSpy('setUserProperties'),
  };
}

/**
 * Create a mock Router
 */
export function mockRouter() {
  return {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
    navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
    events: {
      pipe: jasmine.createSpy('pipe').and.returnValue({
        subscribe: jasmine.createSpy('subscribe'),
      }),
    },
    url: '/',
  };
}

/**
 * Create a mock ActivatedRoute
 */
export function mockActivatedRoute() {
  return {
    params: {
      pipe: jasmine.createSpy('pipe').and.returnValue({
        subscribe: jasmine.createSpy('subscribe'),
      }),
    },
    queryParams: {
      pipe: jasmine.createSpy('pipe').and.returnValue({
        subscribe: jasmine.createSpy('subscribe'),
      }),
    },
    snapshot: {
      params: {},
      queryParams: {},
      data: {},
    },
  };
}

@NgModule({
  imports: [CommonModule, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
  exports: [CommonModule, HttpClientTestingModule, RouterTestingModule, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SharedTestingModule {}
