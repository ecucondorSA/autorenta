import { Injectable } from '@angular/core';

declare const jasmine: any;

/**
 * Creates a comprehensive mock of the Supabase Client.
 * Handles chained calls like .from().select().order().
 */
export function createMockSupabaseClient() {
  const mockPostgrestBuilder = {
    select: jasmine.createSpy('select').and.returnValue({
      order: jasmine.createSpy('order').and.returnValue({
        limit: jasmine.createSpy('limit').and.returnValue(Promise.resolve({ data: [], error: null })),
        range: jasmine.createSpy('range').and.returnValue(Promise.resolve({ data: [], error: null })),
        single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
        maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      }),
      eq: jasmine.createSpy('eq').and.returnValue({
        single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
        maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      }),
      single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
      maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
      limit: jasmine.createSpy('limit').and.returnValue(Promise.resolve({ data: [], error: null })),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    }),
    insert: jasmine.createSpy('insert').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
      }),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    }),
    update: jasmine.createSpy('update').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
        }),
      }),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    }),
    delete: jasmine.createSpy('delete').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue({
          then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }),
    }),
    upsert: jasmine.createSpy('upsert').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
      }),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    }),
  };

  const mockClient = {
    auth: {
      getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
      getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jasmine.createSpy('signInWithPassword').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
      signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve({ error: null })),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy('unsubscribe') } } }),
    },
    from: jasmine.createSpy('from').and.returnValue(mockPostgrestBuilder),
    rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: jasmine.createSpy('invoke').and.returnValue(Promise.resolve({ data: null, error: null })),
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
    storage: {
      from: jasmine.createSpy('from').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
        getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
        createSignedUrl: jasmine.createSpy('createSignedUrl').and.returnValue(Promise.resolve({ data: { signedUrl: 'mock-url' }, error: null })),
        download: jasmine.createSpy('download').and.returnValue(Promise.resolve({ data: new Blob(), error: null })),
      }),
    },
  };

  return mockClient;
}

@Injectable()
export class MockSupabaseClientService {
  public client = createMockSupabaseClient();

  getClient() {
    return this.client;
  }
}
