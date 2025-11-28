/**
 * Checkpoint Types - Estado completo para reanudar tests E2E
 * Arquitectura "Checkpoint & Hydrate"
 */

/**
 * Cookie del navegador
 */
export interface BrowserCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax' | 'Strict' | 'None'
}

/**
 * Estado completo del navegador en un punto específico
 */
export interface BrowserState {
  /** Cookies del contexto */
  cookies: BrowserCookie[]

  /** LocalStorage por origen */
  localStorage: Record<string, Record<string, string>>

  /** SessionStorage por origen */
  sessionStorage: Record<string, Record<string, string>>

  /** URL actual */
  currentUrl: string

  /** Viewport size */
  viewport: { width: number; height: number }
}

/**
 * Entidades creadas durante el test (para cleanup)
 */
export interface CreatedEntities {
  users: string[]
  cars: string[]
  bookings: string[]
  walletTransactions: string[]
  inspections: string[]
  messages: string[]
}

/**
 * Estado de wallet
 */
export interface WalletState {
  userId: string
  balanceCents: number
  availableBalanceCents: number
  lockedBalanceCents: number
}

/**
 * Estado de booking
 */
export interface BookingState {
  id: string
  status: string
  carId: string
  renterId: string
  ownerId: string
  startDate: string
  endDate: string
  totalAmountCents: number
}

/**
 * Estado de la base de datos relevante para el test
 */
export interface DatabaseState {
  /** ID del usuario autenticado */
  userId: string

  /** Email del usuario */
  userEmail: string

  /** Rol del usuario */
  userRole: 'locador' | 'locatario' | 'ambos' | 'admin'

  /** IDs de entidades creadas para este test */
  createdEntities: CreatedEntities

  /** Estado de wallet si aplica */
  walletState?: WalletState

  /** Estado de booking si aplica */
  bookingState?: BookingState

  /** Car ID si aplica */
  selectedCarId?: string
}

/**
 * Estado del formulario si aplica
 */
export interface FormState {
  /** URL de la página con formulario */
  pageUrl: string

  /** Valores de campos */
  fields: Record<string, string | number | boolean>

  /** Campos validados */
  validatedFields: string[]

  /** Errores actuales */
  errors: Record<string, string>
}

/**
 * Checkpoint completo
 */
export interface Checkpoint {
  /** ID único del checkpoint */
  id: string

  /** Nombre descriptivo (ej: 'authenticated', 'car-selected') */
  name: string

  /** Nombre del test o describe al que pertenece */
  testName: string

  /** Número de bloque dentro del test */
  blockNumber: number

  /** Timestamp de creación */
  createdAt: string

  /** Hash de la versión de código (para invalidación) */
  codeVersion: string

  /** TTL en milisegundos (default: 1 hora) */
  ttlMs: number

  /** Estado del navegador */
  browserState: BrowserState

  /** Estado de la base de datos */
  databaseState: DatabaseState

  /** Estado del formulario (opcional) */
  formState?: FormState

  /** Metadata adicional */
  metadata: Record<string, unknown>
}

/**
 * Opciones para crear checkpoint
 */
export interface CreateCheckpointOptions {
  /** Nombre del checkpoint */
  name: string

  /** Capturar estado de formulario */
  captureFormState?: boolean

  /** Selectores CSS de campos a capturar */
  formSelectors?: string[]

  /** TTL personalizado en ms */
  ttlMs?: number

  /** Metadata adicional */
  metadata?: Record<string, unknown>
}

/**
 * Opciones para restaurar checkpoint
 */
export interface RestoreCheckpointOptions {
  /** Validar que el estado DB coincide antes de restaurar */
  validateDbState?: boolean

  /** Recrear entidades faltantes en DB */
  recreateMissingEntities?: boolean

  /** Forzar restauración aunque el checkpoint esté expirado */
  forceRestore?: boolean

  /** Hook antes de navegar */
  beforeNavigate?: () => Promise<void>

  /** Hook después de hidratar */
  afterHydrate?: () => Promise<void>
}

/**
 * Resultado de hidratación
 */
export interface HydrationResult {
  /** Si la hidratación fue exitosa */
  success: boolean

  /** Checkpoint restaurado */
  checkpoint: Checkpoint

  /** Timestamp de restauración */
  restoredAt: string

  /** Duración en ms */
  duration: number

  /** Advertencias durante la restauración */
  warnings: string[]

  /** Error si falló */
  error?: string
}

/**
 * Opciones del storage adapter
 */
export interface StorageAdapterOptions {
  /** Directorio base para FileAdapter */
  baseDir?: string

  /** Máximo de checkpoints en memoria para MemoryAdapter */
  maxCheckpoints?: number
}

/**
 * Interface para storage adapters
 */
export interface ICheckpointStorage {
  /** Guardar checkpoint */
  save(checkpoint: Checkpoint): Promise<void>

  /** Cargar checkpoint por nombre */
  load(name: string, testName?: string): Promise<Checkpoint | null>

  /** Cargar checkpoint por ID */
  loadById(id: string): Promise<Checkpoint | null>

  /** Listar checkpoints de un test */
  list(testName?: string): Promise<Checkpoint[]>

  /** Eliminar checkpoint */
  delete(id: string): Promise<void>

  /** Eliminar checkpoints expirados */
  cleanup(): Promise<number>

  /** Limpiar todos los checkpoints */
  clear(): Promise<void>
}
