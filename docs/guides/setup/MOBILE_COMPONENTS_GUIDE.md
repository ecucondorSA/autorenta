# 📱 Guía de Uso - Componentes Móviles Mejorados

## ✅ Componentes Implementados

### 1. 💀 Skeleton Loader
### 2. 🔄 Pull-to-Refresh

---

## 💀 SKELETON LOADER

### Uso Básico:

```typescript
// En tu componente
import { SkeletonLoaderComponent } from './shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  // ...
  imports: [SkeletonLoaderComponent]
})
```

```html
<!-- Skeleton para card -->
<app-skeleton-loader 
  *ngIf="loading" 
  type="card">
</app-skeleton-loader>

<!-- Contenido real -->
<app-car-card 
  *ngIf="!loading" 
  [car]="car">
</app-car-card>
```

### Tipos Disponibles:

#### 1. Card Skeleton
```html
<app-skeleton-loader type="card"></app-skeleton-loader>
```
Perfecto para: car cards, product cards, cualquier card con imagen

#### 2. Text Skeleton
```html
<app-skeleton-loader 
  type="text" 
  [count]="3">
</app-skeleton-loader>
```
Perfecto para: párrafos de texto, descripciones

#### 3. Circle Skeleton
```html
<app-skeleton-loader type="circle"></app-skeleton-loader>
```
Perfecto para: avatares, profile pictures

#### 4. Rectangle Skeleton
```html
<app-skeleton-loader 
  type="rect" 
  [width]="300" 
  [height]="200">
</app-skeleton-loader>
```
Perfecto para: imágenes, banners, custom shapes

### Ejemplo Completo - Lista de Autos:

```typescript
// cars-list.component.ts
export class CarsListComponent {
  loading = signal(true);
  cars = signal<Car[]>([]);

  async ngOnInit() {
    this.loading.set(true);
    this.cars.set(await this.carService.getCars());
    this.loading.set(false);
  }
}
```

```html
<!-- cars-list.component.html -->
<div class="cars-grid">
  <!-- Skeletons mientras carga -->
  <ng-container *ngIf="loading()">
    <app-skeleton-loader 
      *ngFor="let _ of [1,2,3,4,5,6]" 
      type="card">
    </app-skeleton-loader>
  </ng-container>

  <!-- Contenido real -->
  <app-car-card 
    *ngFor="let car of cars()" 
    [car]="car">
  </app-car-card>
</div>
```

---

## 🔄 PULL-TO-REFRESH

### Uso Básico:

```typescript
// En tu componente
import { PullToRefreshComponent } from './shared/components/pull-to-refresh/pull-to-refresh.component';
import { ViewChild } from '@angular/core';

@Component({
  // ...
  imports: [PullToRefreshComponent]
})
export class CarsListComponent {
  @ViewChild(PullToRefreshComponent) 
  pullToRefresh!: PullToRefreshComponent;

  async handleRefresh() {
    // Recargar datos
    await this.loadCars();
    
    // Completar refresh
    this.pullToRefresh.completeRefresh();
  }
}
```

```html
<!-- Envuelve tu contenido -->
<app-pull-to-refresh (refresh)="handleRefresh()">
  <div class="cars-list">
    <app-car-card 
      *ngFor="let car of cars()" 
      [car]="car">
    </app-car-card>
  </div>
</app-pull-to-refresh>
```

### Ejemplo Completo:

```typescript
// cars-list.component.ts
export class CarsListComponent {
  @ViewChild(PullToRefreshComponent) ptr!: PullToRefreshComponent;
  
  cars = signal<Car[]>([]);
  loading = signal(false);

  async handleRefresh() {
    this.loading.set(true);
    
    try {
      // Simular carga (mínimo 500ms para UX)
      await Promise.all([
        this.carService.getCars(),
        new Promise(r => setTimeout(r, 500))
      ]).then(([cars]) => {
        this.cars.set(cars);
      });
    } finally {
      this.loading.set(false);
      this.ptr.completeRefresh();
    }
  }

  async ngOnInit() {
    await this.loadInitialData();
  }

  private async loadInitialData() {
    this.loading.set(true);
    this.cars.set(await this.carService.getCars());
    this.loading.set(false);
  }
}
```

```html
<!-- cars-list.component.html -->
<app-pull-to-refresh (refresh)="handleRefresh()">
  <!-- Skeleton mientras carga inicial -->
  <div *ngIf="loading()" class="skeleton-container">
    <app-skeleton-loader 
      *ngFor="let _ of [1,2,3,4]" 
      type="card">
    </app-skeleton-loader>
  </div>

  <!-- Contenido real -->
  <div *ngIf="!loading()" class="cars-grid">
    <app-car-card 
      *ngFor="let car of cars()" 
      [car]="car">
    </app-car-card>
  </div>

  <!-- Empty state -->
  <div *ngIf="!loading() && cars().length === 0" class="empty-state">
    <p>No hay autos disponibles</p>
  </div>
</app-pull-to-refresh>
```

---

## 🎨 COMBINANDO AMBOS COMPONENTES

### Ejemplo: Página de Autos con Todo

```typescript
import { Component, ViewChild, signal } from '@angular/core';
import { SkeletonLoaderComponent } from './shared/components/skeleton-loader/skeleton-loader.component';
import { PullToRefreshComponent } from './shared/components/pull-to-refresh/pull-to-refresh.component';

@Component({
  selector: 'app-cars-page',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonLoaderComponent,
    PullToRefreshComponent,
    CarCardComponent
  ],
  templateUrl: './cars-page.component.html'
})
export class CarsPageComponent {
  @ViewChild(PullToRefreshComponent) ptr!: PullToRefreshComponent;
  
  cars = signal<Car[]>([]);
  loading = signal(true);
  refreshing = signal(false);

  async ngOnInit() {
    await this.loadCars();
  }

  async handleRefresh() {
    this.refreshing.set(true);
    await this.loadCars();
    this.refreshing.set(false);
    this.ptr.completeRefresh();
  }

  private async loadCars() {
    this.loading.set(true);
    try {
      const cars = await this.carService.getCars();
      this.cars.set(cars);
    } finally {
      this.loading.set(false);
    }
  }
}
```

```html
<app-pull-to-refresh (refresh)="handleRefresh()">
  <div class="container">
    <!-- Header -->
    <header class="page-header">
      <h1>Autos Disponibles</h1>
    </header>

    <!-- Skeleton Loader -->
    <div *ngIf="loading() && !refreshing()" class="grid">
      <app-skeleton-loader 
        *ngFor="let _ of [1,2,3,4,5,6]" 
        type="card">
      </app-skeleton-loader>
    </div>

    <!-- Contenido Real -->
    <div *ngIf="!loading() || refreshing()" class="grid">
      <app-car-card 
        *ngFor="let car of cars()" 
        [car]="car">
      </app-car-card>
    </div>

    <!-- Empty State -->
    <div *ngIf="!loading() && cars().length === 0" class="empty">
      <p>No hay autos disponibles</p>
      <button (click)="handleRefresh()">Reintentar</button>
    </div>
  </div>
</app-pull-to-refresh>
```

---

## 📊 MEJORAS DE UX

### Antes:
- ❌ Pantalla blanca mientras carga
- ❌ No hay feedback visual
- ❌ Usuario no sabe si está cargando
- ❌ Sin forma de refrescar datos

### Después:
- ✅ Skeleton muestra estructura mientras carga
- ✅ Pull-to-refresh para actualizar
- ✅ Animaciones suaves
- ✅ Feedback visual constante
- ✅ UX profesional como apps nativas

---

## 🎯 MEJORES PRÁCTICAS

### 1. Usar Skeletons para TODO que cargue
```typescript
// ✅ BIEN
<app-skeleton-loader *ngIf="loading" type="card"></app-skeleton-loader>
<app-car-card *ngIf="!loading" [car]="car"></app-car-card>

// ❌ MAL
<div *ngIf="loading">Cargando...</div>
<app-car-card *ngIf="!loading" [car]="car"></app-car-card>
```

### 2. Mantener Pull-to-Refresh simple
```typescript
// ✅ BIEN
async handleRefresh() {
  await this.loadData();
  this.ptr.completeRefresh();
}

// ❌ MAL - No llamar completeRefresh
async handleRefresh() {
  await this.loadData();
  // Falta completeRefresh()
}
```

### 3. Usar señales para reactive UI
```typescript
// ✅ BIEN
loading = signal(false);
cars = signal<Car[]>([]);

// ❌ MAL - Variables normales
loading = false;
cars: Car[] = [];
```

---

## 🚀 PRÓXIMOS PASOS

1. Añadir Skeletons a todas las páginas con carga
2. Implementar Pull-to-Refresh en listas principales
3. Probar en dispositivo móvil real
4. Ajustar tiempos de animación según necesidad

---

## 📱 TESTING

### En Navegador:
1. Chrome DevTools (F12)
2. Device Toolbar (Ctrl+Shift+M)
3. Selecciona iPhone o Android
4. Prueba pull-to-refresh con mouse

### En Móvil Real:
1. Desliza hacia abajo para refrescar
2. Observa skeletons mientras carga
3. Siente vibración al completar refresh

---

¡Ya tienes los componentes listos para usar! 🎉
