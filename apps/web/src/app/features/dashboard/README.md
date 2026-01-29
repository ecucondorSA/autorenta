Dashboard feature
=================

Carpeta con componentes standalone mínimos para el Dashboard de locadores/locatarios.

Archivos incluidos:
- `dashboard.page.ts` — página principal que compone los widgets.
- `widgets/statistics.component.ts` — widget de estadísticas (mock).
- `widgets/calendar.component.ts` — placeholder para calendario.
- `widgets/payouts.component.ts` — widget de payouts (mock).

Cómo usar
---------
Importar `DashboardPage` donde haga falta o agregar ruta lazy:

```
{ path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage) }
```

Notas
-----
Estos componentes son un scaffold inicial con datos mock. Integrar servicios y stores reales (Supabase clients, Stores) en la próxima iteración.
