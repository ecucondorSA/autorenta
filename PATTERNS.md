# 📐 AutoRenta Code Patterns

## 📅 Última actualización: 16 de Octubre de 2025

Este documento define los patterns y templates de código para AutoRenta. Sirve como guía para desarrolladores y como contexto para Claude Skills.

---

## 🎯 Principios Arquitectónicos

### 1. Standalone Components
- Todos los componentes son standalone (no NgModules)
- Lazy-loading vía routes
- Imports explícitos en cada componente

### 2. Separation of Concerns
- **Components**: UI y user interaction solamente
- **Services**: Lógica de negocio y llamadas a Supabase
- **Models**: Interfaces TypeScript type-safe

### 3. Dependency Injection
- Usar `inject()` function-based DI
- `injectSupabase()` para acceso a Supabase client
- No usar constructor injection

---

## 📦 Service Layer Patterns

### ✅ Service Template Base

```typescript
// Template: feature.service.ts
import { inject } from '@angular/core';
import { injectSupabase } from '@/core/services/supabase-client.service';
import type { Database } from '@/core/types/database.types';
import type { {{Entity}} } from '@/core/models/{{entity}}.model';

/**
 * Service para gestión de {{entities}}
 * Maneja todas las operaciones CRUD y lógica de negocio
 */
export class {{Feature}}Service {
  // Dependency Injection
  private supabase = injectSupabase();

  /**
   * Obtiene lista de {{entities}}
   * @returns Promise con array de {{entities}}
   * @throws Error si falla la consulta
   */
  async get{{Entities}}(): Promise<{{Entity}}[]> {
    try {
      const { data, error } = await this.supabase
        .from('{{table_name}}')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as {{Entity}}[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error obteniendo {{entities}}: ${message}`);
    }
  }

  /**
   * Obtiene {{entity}} por ID
   * @param id - ID del {{entity}}
   * @returns Promise con {{entity}} o null si no existe
   */
  async get{{Entity}}ById(id: string): Promise<{{Entity}} | null> {
    try {
      const { data, error } = await this.supabase
        .from('{{table_name}}')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as {{Entity}};
    } catch (error) {
      console.error(`Error obteniendo {{entity}} ${id}:`, error);
      return null;
    }
  }

  /**
   * Crea nuevo {{entity}}
   * @param {{entity}}Data - Datos del {{entity}} a crear
   * @returns Promise con {{entity}} creado
   */
  async create{{Entity}}(
    {{entity}}Data: Omit<{{Entity}}, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{{Entity}}> {
    try {
      // Validaciones
      this.validate{{Entity}}Data({{entity}}Data);

      const { data, error } = await this.supabase
        .from('{{table_name}}')
        .insert({{entity}}Data)
        .select()
        .single();

      if (error) throw error;
      return data as {{Entity}};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error creando {{entity}}: ${message}`);
    }
  }

  /**
   * Actualiza {{entity}} existente
   * @param id - ID del {{entity}}
   * @param updates - Datos a actualizar
   * @returns Promise con {{entity}} actualizado
   */
  async update{{Entity}}(
    id: string,
    updates: Partial<{{Entity}}>
  ): Promise<{{Entity}}> {
    try {
      const { data, error } = await this.supabase
        .from('{{table_name}}')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as {{Entity}};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error actualizando {{entity}}: ${message}`);
    }
  }

  /**
   * Elimina {{entity}}
   * @param id - ID del {{entity}} a eliminar
   */
  async delete{{Entity}}(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('{{table_name}}')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error eliminando {{entity}}: ${message}`);
    }
  }

  /**
   * Valida datos del {{entity}}
   * @private
   */
  private validate{{Entity}}Data(data: any): void {
    // Agregar validaciones específicas
    if (!data.name) {
      throw new Error('El nombre es requerido');
    }
  }
}
```

### 🔍 Service con Filtros

```typescript
/**
 * Busca {{entities}} con filtros
 * @param filters - Filtros a aplicar
 * @returns Promise con {{entities}} filtrados
 */
async search{{Entities}}(filters: {
  search?: string;
  status?: string;
  userId?: string;
}): Promise<{{Entity}}[]> {
  try {
    let query = this.supabase
      .from('{{table_name}}')
      .select('*');

    // Aplicar filtros dinámicamente
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as {{Entity}}[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error buscando {{entities}}: ${message}`);
  }
}
```

### 📸 Service con Storage (Upload de Archivos)

```typescript
import { v4 as uuidv4 } from 'uuid';

/**
 * Sube archivo a Supabase Storage
 * @param file - Archivo a subir
 * @param {{entity}}Id - ID del {{entity}}
 * @returns Promise con URL pública del archivo
 */
async uploadFile(file: File, {{entity}}Id: string): Promise<string> {
  try {
    // Obtener usuario autenticado
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Validaciones de archivo
    this.validateFile(file);

    // Construir path SIN prefijo de bucket (CRÍTICO para RLS)
    const extension = file.name.split('.').pop() ?? 'jpg';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = `${user.id}/{{entities}}/${{{entity}}Id}/${fileName}`;

    // Upload a storage
    const { error: uploadError } = await this.supabase.storage
      .from('{{bucket_name}}')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from('{{bucket_name}}')
      .getPublicUrl(filePath);

    // Guardar referencia en database
    await this.save{{Entity}}File({
      {{entity}}_id: {{entity}}Id,
      file_path: filePath,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    return publicUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error subiendo archivo: ${message}`);
  }
}

/**
 * Valida archivo antes de upload
 * @private
 */
private validateFile(file: File): void {
  // Validar tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Usa JPG, PNG o WebP');
  }

  // Validar tamaño (2MB max)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('El archivo no debe superar 2MB');
  }
}

/**
 * Elimina archivo de storage
 * @param filePath - Path del archivo en storage
 */
async deleteFile(filePath: string): Promise<void> {
  try {
    const { error } = await this.supabase.storage
      .from('{{bucket_name}}')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    // No throw - eliminación de archivo es soft failure
  }
}
```

---

## 🎨 Component Patterns

### ✅ Page Component Template

```typescript
// Template: feature-page.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { {{Feature}}Service } from '@/core/services/{{feature}}.service';
import type { {{Entity}} } from '@/core/models/{{entity}}.model';

/**
 * Página de {{feature}}
 * Muestra y gestiona {{entities}}
 */
@Component({
  selector: 'app-{{feature}}-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './{{feature}}-page.component.html',
  styleUrl: './{{feature}}-page.component.css',
})
export class {{Feature}}PageComponent implements OnInit {
  // Dependency Injection
  private {{feature}}Service = inject({{Feature}}Service);
  private router = inject(Router);

  // State (usando signals)
  {{entities}} = signal<{{Entity}}[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load{{Entities}}();
  }

  /**
   * Carga {{entities}} desde el servidor
   */
  async load{{Entities}}(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.{{feature}}Service.get{{Entities}}();
      this.{{entities}}.set(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.error.set(message);
      console.error('Error cargando {{entities}}:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Navega a detalle de {{entity}}
   */
  viewDetail(id: string): void {
    this.router.navigate(['/{{feature}}', id]);
  }

  /**
   * Elimina {{entity}} con confirmación
   */
  async delete{{Entity}}({{entity}}: {{Entity}}): Promise<void> {
    const confirmed = confirm(`¿Eliminar ${{{entity}}.name}?`);
    if (!confirmed) return;

    try {
      await this.{{feature}}Service.delete{{Entity}}({{entity}}.id);
      await this.load{{Entities}}(); // Recargar lista
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error eliminando';
      alert(message);
    }
  }
}
```

### 🧩 Reusable Component Template

```typescript
// Template: feature-card.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { {{Entity}} } from '@/core/models/{{entity}}.model';

/**
 * Componente card para mostrar {{entity}}
 * Componente reutilizable y presentacional
 */
@Component({
  selector: 'app-{{entity}}-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" (click)="cardClick.emit({{entity}}())">
      <img
        [src]="{{entity}}().image_url || '/assets/placeholder.jpg'"
        [alt]="{{entity}}().name"
        class="card-image"
      />
      <div class="card-content">
        <h3>{{ {{entity}}().name }}</h3>
        <p>{{ {{entity}}().description }}</p>

        <div class="card-actions">
          <button
            (click)="editClick.emit({{entity}}()); $event.stopPropagation()"
            class="btn-secondary"
          >
            Editar
          </button>
          <button
            (click)="deleteClick.emit({{entity}}()); $event.stopPropagation()"
            class="btn-danger"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .card-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }

    .card-content {
      padding: 1rem;
    }

    .card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `],
})
export class {{Entity}}CardComponent {
  // Inputs (usando signal inputs)
  {{entity}} = input.required<{{Entity}}>();

  // Outputs (usando output function)
  cardClick = output<{{Entity}}>();
  editClick = output<{{Entity}}>();
  deleteClick = output<{{Entity}}>();
}
```

### 📝 Form Component Template

```typescript
// Template: feature-form.component.ts
import { Component, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { {{Entity}} } from '@/core/models/{{entity}}.model';

/**
 * Formulario para crear/editar {{entity}}
 */
@Component({
  selector: 'app-{{entity}}-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './{{entity}}-form.component.html',
})
export class {{Entity}}FormComponent {
  private fb = inject(FormBuilder);

  // Inputs
  {{entity}} = input<{{Entity}} | null>(null);
  submitLabel = input<string>('Guardar');

  // Outputs
  formSubmit = output<Partial<{{Entity}}>>();
  formCancel = output<void>();

  // Form
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status: ['active', Validators.required],
  });

  constructor() {
    // Effect para cargar datos cuando se pasa {{entity}} existente
    effect(() => {
      const {{entity}} = this.{{entity}}();
      if ({{entity}}) {
        this.form.patchValue({
          name: {{entity}}.name,
          description: {{entity}}.description,
          status: {{entity}}.status,
        });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formSubmit.emit(this.form.value);
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}
```

---

## 🛣️ Routing Patterns

### ✅ Feature Routes Template

```typescript
// Template: feature.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '@/core/guards/auth.guard';

export const {{FEATURE}}_ROUTES: Routes = [
  {
    path: '',
    canMatch: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./list/{{feature}}-list.page').then(m => m.{{Feature}}ListPage),
        title: '{{Entities}} | AutoRenta',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./create/{{feature}}-create.page').then(m => m.{{Feature}}CreatePage),
        title: 'Nuevo {{Entity}} | AutoRenta',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./detail/{{feature}}-detail.page').then(m => m.{{Feature}}DetailPage),
        title: '{{Entity}} | AutoRenta',
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./edit/{{feature}}-edit.page').then(m => m.{{Feature}}EditPage),
        title: 'Editar {{Entity}} | AutoRenta',
      },
    ],
  },
];
```

---

## 📊 Model/Interface Patterns

### ✅ Entity Model Template

```typescript
// Template: entity.model.ts
/**
 * {{Entity}} entity
 * Representa un {{entity}} en el sistema
 */
export interface {{Entity}} {
  // IDs
  id: string;
  user_id: string;

  // Datos básicos
  name: string;
  description: string | null;
  status: '{{status1}}' | '{{status2}}' | '{{status3}}';

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * DTO para crear {{entity}}
 * Omite campos generados automáticamente
 */
export type Create{{Entity}}DTO = Omit<
  {{Entity}},
  'id' | 'created_at' | 'updated_at'
>;

/**
 * DTO para actualizar {{entity}}
 * Todos los campos son opcionales excepto ID
 */
export type Update{{Entity}}DTO = Partial<Omit<{{Entity}}, 'id'>> & {
  id: string;
};
```

---

## 🔐 Auth Guard Pattern

```typescript
// auth.guard.ts (existente - para referencia)
import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';

export const authGuard: CanMatchFn = async (route, segments) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};
```

---

## 🧪 Test Patterns

### ✅ Service Test Template

```typescript
// Template: feature.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { {{Feature}}Service } from './{{feature}}.service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('{{Feature}}Service', () => {
  let service: {{Feature}}Service;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;

  beforeEach(() => {
    // Crear mock de Supabase
    mockSupabase = jasmine.createSpyObj('SupabaseClient', [
      'from',
      'storage',
      'auth',
    ]);

    TestBed.configureTestingModule({
      providers: [
        {{Feature}}Service,
        { provide: 'SupabaseClient', useValue: mockSupabase },
      ],
    });

    service = TestBed.inject({{Feature}}Service);
  });

  describe('get{{Entities}}', () => {
    it('should return list of {{entities}}', async () => {
      const mock{{Entities}} = [
        { id: '1', name: 'Test 1', status: 'active' },
        { id: '2', name: 'Test 2', status: 'active' },
      ];

      mockSupabase.from.and.returnValue({
        select: () => ({
          order: () => Promise.resolve({
            data: mock{{Entities}},
            error: null
          }),
        }),
      } as any);

      const result = await service.get{{Entities}}();

      expect(result).toEqual(mock{{Entities}});
      expect(mockSupabase.from).toHaveBeenCalledWith('{{table_name}}');
    });

    it('should throw error on failure', async () => {
      mockSupabase.from.and.returnValue({
        select: () => ({
          order: () => Promise.resolve({
            data: null,
            error: { message: 'DB Error' }
          }),
        }),
      } as any);

      await expectAsync(service.get{{Entities}}())
        .toBeRejectedWithError(/Error obteniendo {{entities}}/);
    });
  });

  describe('create{{Entity}}', () => {
    it('should create {{entity}} successfully', async () => {
      const new{{Entity}}Data = {
        name: 'New {{Entity}}',
        description: 'Test description',
        status: 'active' as const,
      };

      const created{{Entity}} = {
        id: 'new-id',
        ...new{{Entity}}Data,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.and.returnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: created{{Entity}},
              error: null
            }),
          }),
        }),
      } as any);

      const result = await service.create{{Entity}}(new{{Entity}}Data);

      expect(result.id).toBe('new-id');
      expect(result.name).toBe(new{{Entity}}Data.name);
    });
  });
});
```

### ✅ Component Test Template

```typescript
// Template: feature-page.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { {{Feature}}PageComponent } from './{{feature}}-page.component';
import { {{Feature}}Service } from '@/core/services/{{feature}}.service';
import { Router } from '@angular/router';

describe('{{Feature}}PageComponent', () => {
  let component: {{Feature}}PageComponent;
  let fixture: ComponentFixture<{{Feature}}PageComponent>;
  let mockService: jasmine.SpyObj<{{Feature}}Service>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('{{Feature}}Service', [
      'get{{Entities}}',
      'delete{{Entity}}',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [{{Feature}}PageComponent],
      providers: [
        { provide: {{Feature}}Service, useValue: mockService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent({{Feature}}PageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load {{entities}} on init', async () => {
    const mock{{Entities}} = [
      { id: '1', name: 'Test 1' },
      { id: '2', name: 'Test 2' },
    ];

    mockService.get{{Entities}}.and.resolveTo(mock{{Entities}});

    await component.ngOnInit();

    expect(component.{{entities}}()).toEqual(mock{{Entities}});
    expect(component.loading()).toBe(false);
  });

  it('should handle error on load', async () => {
    mockService.get{{Entities}}.and.rejectWith(new Error('Load failed'));

    await component.ngOnInit();

    expect(component.error()).toContain('Load failed');
    expect(component.loading()).toBe(false);
  });

  it('should navigate to detail on view', () => {
    component.viewDetail('test-id');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/{{feature}}', 'test-id']);
  });
});
```

---

## 📝 SQL Migration Pattern

```sql
-- Template: YYYYMMDD_create_{{table_name}}_table.sql

-- Create table
CREATE TABLE IF NOT EXISTS public.{{table_name}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Datos específicos
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_{{table_name}}_user_id ON public.{{table_name}}(user_id);
CREATE INDEX idx_{{table_name}}_status ON public.{{table_name}}(status);
CREATE INDEX idx_{{table_name}}_created_at ON public.{{table_name}}(created_at DESC);

-- Enable RLS
ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can view their own records
CREATE POLICY "Users can view own {{entities}}"
ON public.{{table_name}}
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create their own records
CREATE POLICY "Users can create own {{entities}}"
ON public.{{table_name}}
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own records
CREATE POLICY "Users can update own {{entities}}"
ON public.{{table_name}}
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own records
CREATE POLICY "Users can delete own {{entities}}"
ON public.{{table_name}}
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_{{table_name}}_updated_at
  BEFORE UPDATE ON public.{{table_name}}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🎨 Tailwind CSS Patterns

### ✅ Layout Classes

```html
<!-- Container -->
<div class="container mx-auto px-4 py-8 max-w-7xl">

<!-- Grid de cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- Card -->
<div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">

<!-- Button Primary -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">

<!-- Button Secondary -->
<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">

<!-- Input -->
<input class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
```

---

## ✅ Naming Conventions

### Files
- Components: `feature-name.component.ts`
- Services: `feature-name.service.ts`
- Models: `entity-name.model.ts`
- Guards: `guard-name.guard.ts`
- Pages: `page-name.page.ts`

### Classes
- Components: `FeatureNameComponent`
- Services: `FeatureNameService`
- Guards: `guardName` (camelCase function)

### Variables
- camelCase para variables y funciones
- PascalCase para clases e interfaces
- UPPER_CASE para constantes

---

## 🚫 Anti-Patterns (Evitar)

### ❌ NO usar NgModules
```typescript
// ❌ INCORRECTO
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule],
})
export class MyModule {}

// ✅ CORRECTO
@Component({
  standalone: true,
  imports: [CommonModule],
})
export class MyComponent {}
```

### ❌ NO usar Constructor Injection
```typescript
// ❌ INCORRECTO
constructor(private service: MyService) {}

// ✅ CORRECTO
private service = inject(MyService);
```

### ❌ NO incluir bucket prefix en storage paths
```typescript
// ❌ INCORRECTO
const filePath = `avatars/${userId}/${filename}`;

// ✅ CORRECTO
const filePath = `${userId}/${filename}`;
```

### ❌ NO exponer Supabase client directamente
```typescript
// ❌ INCORRECTO
export class MyComponent {
  supabase = inject(SupabaseClient);

  async loadData() {
    this.supabase.from('table')... // Lógica en component
  }
}

// ✅ CORRECTO
export class MyComponent {
  myService = inject(MyService);

  async loadData() {
    this.myService.getData(); // Lógica en service
  }
}
```

---

## 📚 Recursos

- **CLAUDE.md**: Arquitectura y workflows
- **CLAUDE_SKILLS_GUIDE.md**: Uso de Skills
- **database.types.ts**: Tipos TypeScript del schema
- **Angular Docs**: https://angular.dev

---

## 🔄 Actualización de Patterns

Este documento debe actualizarse cuando:
1. Se introducen nuevos patterns arquitectónicos
2. Se identifican anti-patterns
3. Se cambian convenciones de naming
4. Se agregan nuevas dependencias core

**Última revisión**: 16 de Octubre de 2025
**Próxima revisión**: Mensual o cuando haya cambios significativos
