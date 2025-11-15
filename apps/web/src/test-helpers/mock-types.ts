/**
 * Mock Types - Sistema de tipos compartidos para tests
 *
 * Proporciona interfaces estrictas para mocks de Supabase, evitando el uso de 'any'
 * y proporcionando autocompletado en tests.
 *
 * @example
 * ```typescript
 * const mockClient: MockSupabaseClient = createMockSupabaseClient();
 * const builder: MockQueryBuilder = mockClient.from('cars');
 * ```
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Resultado genérico de operaciones de Supabase
 */
export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

/**
 * Usuario mock de Supabase Auth
 */
export interface MockUser {
  id: string;
  email: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  aud?: string;
  created_at?: string;
}

/**
 * Sesión mock de Supabase Auth
 */
export interface MockSession {
  access_token: string;
  refresh_token?: string;
  user: MockUser;
  expires_at?: number;
  expires_in?: number;
}

// ============================================================================
// QUERY BUILDER
// ============================================================================

/**
 * Mock del QueryBuilder de Supabase con métodos encadenables
 *
 * Soporta el patrón builder para queries como:
 * `from('table').select('*').eq('id', 1).single()`
 */
export interface MockQueryBuilder<T = any> {
  select: jasmine.Spy<(columns?: string) => MockQueryBuilder<T>>;
  insert: jasmine.Spy<(data: Partial<T> | Partial<T>[]) => MockQueryBuilder<T>>;
  update: jasmine.Spy<(data: Partial<T>) => MockQueryBuilder<T>>;
  delete: jasmine.Spy<() => MockQueryBuilder<T>>;
  upsert: jasmine.Spy<(data: Partial<T> | Partial<T>[]) => MockQueryBuilder<T>>;

  // Filtros
  eq: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  neq: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  gt: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  gte: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  lt: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  lte: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  like: jasmine.Spy<(column: string, pattern: string) => MockQueryBuilder<T>>;
  ilike: jasmine.Spy<(column: string, pattern: string) => MockQueryBuilder<T>>;
  is: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;
  in: jasmine.Spy<(column: string, values: any[]) => MockQueryBuilder<T>>;
  contains: jasmine.Spy<(column: string, value: unknown) => MockQueryBuilder<T>>;

  // Ordenamiento y limitación
  order: jasmine.Spy<(column: string, options?: { ascending?: boolean }) => MockQueryBuilder<T>>;
  limit: jasmine.Spy<(count: number) => MockQueryBuilder<T>>;
  range: jasmine.Spy<(from: number, to: number) => MockQueryBuilder<T>>;

  // Ejecución
  single: jasmine.Spy<() => Promise<MockSupabaseResponse<T>>>;
  maybeSingle: jasmine.Spy<() => Promise<MockSupabaseResponse<T | null>>>;

  // Propiedad especial para permitir await directo
  then: (
    onFulfilled: (value: MockSupabaseResponse<T[] | T>) => any,
    onRejected?: (reason: unknown) => any,
  ) => Promise<any>;
}

// ============================================================================
// STORAGE
// ============================================================================

/**
 * Mock del Storage Bucket de Supabase
 */
export interface MockStorageBucket {
  upload: jasmine.Spy<
    (
      path: string,
      file: File | Blob,
      options?: { cacheControl?: string; upsert?: boolean },
    ) => Promise<MockSupabaseResponse<{ path: string; id?: string; fullPath?: string }>>
  >;

  download: jasmine.Spy<(path: string) => Promise<MockSupabaseResponse<Blob>>>;

  remove: jasmine.Spy<(paths: string[]) => Promise<MockSupabaseResponse<{ message?: string }>>>;

  getPublicUrl: jasmine.Spy<(path: string) => { data: { publicUrl: string } }>;

  createSignedUrl: jasmine.Spy<
    (path: string, expiresIn: number) => Promise<MockSupabaseResponse<{ signedUrl: string }>>
  >;

  list: jasmine.Spy<
    (
      path?: string,
      options?: { limit?: number; offset?: number },
    ) => Promise<MockSupabaseResponse<Array<{ name: string; id?: string }>>>
  >;
}

/**
 * Mock del Storage de Supabase
 */
export interface MockStorage {
  from: jasmine.Spy<(bucket: string) => MockStorageBucket>;
}

// ============================================================================
// AUTH
// ============================================================================

/**
 * Mock del Auth de Supabase
 */
export interface MockAuth {
  getSession: jasmine.Spy<() => Promise<MockSupabaseResponse<{ session: MockSession | null }>>>;

  getUser: jasmine.Spy<() => Promise<MockSupabaseResponse<{ user: MockUser | null }>>>;

  signInWithPassword: jasmine.Spy<
    (credentials: {
      email: string;
      password: string;
    }) => Promise<MockSupabaseResponse<{ session: MockSession; user: MockUser }>>
  >;

  signUp: jasmine.Spy<
    (credentials: {
      email: string;
      password: string;
      options?: { data?: Record<string, any> };
    }) => Promise<MockSupabaseResponse<{ session: MockSession | null; user: MockUser }>>
  >;

  signOut: jasmine.Spy<() => Promise<MockSupabaseResponse<Record<string, never>>>>;

  onAuthStateChange: jasmine.Spy<
    (callback: (event: string, session: MockSession | null) => void) => {
      data: { subscription: { unsubscribe: () => void } };
    }
  >;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Respuesta de Edge Function
 */
export interface MockFunctionResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * Mock de Functions de Supabase
 */
export interface MockFunctions {
  invoke: jasmine.Spy<
    (
      functionName: string,
      options?: { body?: unknown; headers?: Record<string, string> },
    ) => Promise<MockFunctionResponse>
  >;
}

// ============================================================================
// RPC
// ============================================================================

/**
 * Tipo para llamadas RPC
 */
export type MockRpcCall = jasmine.Spy<
  (functionName: string, params?: Record<string, any>) => Promise<MockSupabaseResponse>
>;

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Mock completo del cliente de Supabase
 *
 * Incluye todos los métodos principales: from, storage, auth, functions, rpc
 */
export interface MockSupabaseClient {
  from: jasmine.Spy<(table: string) => MockQueryBuilder>;
  storage: MockStorage;
  auth: MockAuth;
  functions: MockFunctions;
  rpc: MockRpcCall;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Crea un QueryBuilder mock con valores por defecto
 *
 * @param defaultData - Datos que retornará el builder por defecto
 * @returns QueryBuilder mock configurado
 */
export function createMockQueryBuilder<T = any>(
  defaultData: T | T[] | null = null,
): MockQueryBuilder<T> {
  const builder: any = {};

  // Métodos de selección
  builder.select = jasmine.createSpy('select').and.returnValue(builder);
  builder.insert = jasmine.createSpy('insert').and.returnValue(builder);
  builder.update = jasmine.createSpy('update').and.returnValue(builder);
  builder.delete = jasmine.createSpy('delete').and.returnValue(builder);
  builder.upsert = jasmine.createSpy('upsert').and.returnValue(builder);

  // Filtros
  builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
  builder.neq = jasmine.createSpy('neq').and.returnValue(builder);
  builder.gt = jasmine.createSpy('gt').and.returnValue(builder);
  builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
  builder.lt = jasmine.createSpy('lt').and.returnValue(builder);
  builder.lte = jasmine.createSpy('lte').and.returnValue(builder);
  builder.like = jasmine.createSpy('like').and.returnValue(builder);
  builder.ilike = jasmine.createSpy('ilike').and.returnValue(builder);
  builder.is = jasmine.createSpy('is').and.returnValue(builder);
  builder.in = jasmine.createSpy('in').and.returnValue(builder);
  builder.contains = jasmine.createSpy('contains').and.returnValue(builder);

  // Ordenamiento y limitación
  builder.order = jasmine.createSpy('order').and.returnValue(builder);
  builder.limit = jasmine.createSpy('limit').and.returnValue(builder);
  builder.range = jasmine.createSpy('range').and.returnValue(builder);

  // Ejecución
  builder.single = jasmine.createSpy('single').and.resolveTo({ data: defaultData, error: null });
  builder.maybeSingle = jasmine
    .createSpy('maybeSingle')
    .and.resolveTo({ data: defaultData, error: null });

  // Soporte para await directo
  builder.then = (onFulfilled?: ((value: { data: T | T[] | null; error: null }) => any) | null) => {
    return Promise.resolve({ data: defaultData, error: null }).then(onFulfilled as any);
  };

  return builder as MockQueryBuilder<T>;
}

/**
 * Crea un Storage Bucket mock
 *
 * @returns Storage Bucket mock configurado
 */
export function createMockStorageBucket(): MockStorageBucket {
  return {
    upload: jasmine.createSpy('upload').and.resolveTo({
      data: { path: 'mock-path/file.jpg', id: 'mock-id' },
      error: null,
    }),
    download: jasmine.createSpy('download').and.resolveTo({
      data: new Blob(['mock data']),
      error: null,
    }),
    remove: jasmine.createSpy('remove').and.resolveTo({
      data: { message: 'Files removed' },
      error: null,
    }),
    getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
      data: { publicUrl: 'https://example.com/mock-path/file.jpg' },
    }),
    createSignedUrl: jasmine.createSpy('createSignedUrl').and.resolveTo({
      data: { signedUrl: 'https://example.com/signed/mock-path' },
      error: null,
    }),
    list: jasmine.createSpy('list').and.resolveTo({
      data: [],
      error: null,
    }),
  };
}

/**
 * Crea un Auth mock
 *
 * @param mockUser - Usuario mock (opcional)
 * @returns Auth mock configurado
 */
export function createMockAuth(mockUser: MockUser | null = null): MockAuth {
  const defaultUser: MockUser = mockUser || {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
  };

  const defaultSession: MockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: defaultUser,
    expires_at: Date.now() + 3600000,
  };

  return {
    getSession: jasmine.createSpy('getSession').and.resolveTo({
      data: { session: defaultSession },
      error: null,
    }),
    getUser: jasmine.createSpy('getUser').and.resolveTo({
      data: { user: defaultUser },
      error: null,
    }),
    signInWithPassword: jasmine.createSpy('signInWithPassword').and.resolveTo({
      data: { session: defaultSession, user: defaultUser },
      error: null,
    }),
    signUp: jasmine.createSpy('signUp').and.resolveTo({
      data: { session: defaultSession, user: defaultUser },
      error: null,
    }),
    signOut: jasmine.createSpy('signOut').and.resolveTo({
      data: {},
      error: null,
    }),
    onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({
      data: {
        subscription: {
          unsubscribe: jasmine.createSpy('unsubscribe'),
        },
      },
    }),
  };
}

/**
 * Crea un cliente de Supabase mock completo
 *
 * @param options - Opciones para configurar el mock
 * @returns Cliente de Supabase mock
 *
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabaseClient({
 *   defaultData: [{ id: 1, name: 'Test' }],
 *   user: { id: 'user-1', email: 'user@example.com' },
 * });
 * ```
 */
export function createMockSupabaseClient(options?: {
  defaultData?: unknown;
  user?: MockUser | null;
}): MockSupabaseClient {
  const mockBucket = createMockStorageBucket();
  const mockAuth = createMockAuth(options?.user || null);

  return {
    from: jasmine.createSpy('from').and.callFake((_table: string) => {
      return createMockQueryBuilder(options?.defaultData);
    }),
    storage: {
      from: jasmine.createSpy('storage.from').and.returnValue(mockBucket),
    },
    auth: mockAuth,
    functions: {
      invoke: jasmine.createSpy('invoke').and.resolveTo({
        data: { success: true },
        error: null,
      }),
    },
    rpc: jasmine.createSpy('rpc').and.resolveTo({
      data: {},
      error: null,
    }),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Configura un mock para retornar un error
 *
 * @param spy - Spy de Jasmine a configurar
 * @param errorMessage - Mensaje de error
 * @param errorCode - Código de error (opcional)
 */
export function mockError(spy: jasmine.Spy, errorMessage: string, errorCode?: string): void {
  spy.and.resolveTo({
    data: null,
    error: {
      message: errorMessage,
      code: errorCode,
    },
  });
}

/**
 * Configura un mock para retornar datos exitosos
 *
 * @param spy - Spy de Jasmine a configurar
 * @param data - Datos a retornar
 */
export function mockSuccess<T>(spy: jasmine.Spy, data: T): void {
  spy.and.resolveTo({
    data,
    error: null,
  });
}

/**
 * Constantes útiles para tests
 */
export const TEST_CONSTANTS = {
  VALID_UUID: '00000000-0000-0000-0000-000000000000',
  VALID_EMAIL: 'test@example.com',
  VALID_TOKEN: 'mock-access-token',
  STORAGE_URL: 'https://example.com/storage',
} as const;
