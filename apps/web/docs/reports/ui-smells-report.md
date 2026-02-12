# 🕵️ Reporte de Defectos Visuales (UI Smells)

Fecha: 12/9/2025, 5:40:56 AM
Total problemas encontrados: 1227

### 📄 app/app.component.html
- 🟠 **Línea 194:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 214:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 249:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 271:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 291:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 313:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 333:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 353:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 373:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`
- 🟠 **Línea 393:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"...`

### 📄 app/app.component.ts
- 🟠 **Línea 83:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🟠 **Línea 85:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `isolation: auto !important;`
- 🟠 **Línea 90:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🟠 **Línea 123:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary) !important;`
- 🟠 **Línea 131:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: inherit !important;`
- 🟠 **Línea 135:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `stroke: currentColor !important;`
- 🟠 **Línea 139:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `filter: none !important;`
- 🟠 **Línea 146:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary) !important;`

### 📄 app/core/services/mapbox-preloader.service.ts
- 🔵 **Línea 92:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 600px;`

### 📄 app/features/admin/accounting/accounting-admin.page.css
- 🟠 **Línea 290:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 3rem 1rem !important;`

### 📄 app/features/admin/accounting/audit-logs/audit-logs.page.ts
- 🟠 **Línea 21:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid grid-cols-1 gap-4 md:grid-cols-4">`

### 📄 app/features/admin/accounting/pages/dashboard.page.scss
- 🟠 **Línea 16:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-1 {`
- 🟠 **Línea 20:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 25:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-3 {`
- 🟠 **Línea 29:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-4 {`
- 🟠 **Línea 64:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 74:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`

### 📄 app/features/admin/accounting/pages/financial-health.page.scss
- 🟠 **Línea 23:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`

### 📄 app/features/admin/accounting/pages/income-statement.page.ts
- 🟠 **Línea 145:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-3 {`

### 📄 app/features/admin/accounting/pages/ledger.page.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-1 {`
- 🟠 **Línea 15:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-3 {`
- 🟠 **Línea 46:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`

### 📄 app/features/admin/accounting/pages/manual-journal-entry.page.scss
- 🟠 **Línea 35:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 50:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 103:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`

### 📄 app/features/admin/accounting/pages/period-closures.page.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-1 {`
- 🟠 **Línea 14:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 19:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-2 {`
- 🟠 **Línea 50:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`

### 📄 app/features/admin/accounting/pages/revenue-recognition.page.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-1 {`
- 🟠 **Línea 14:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-3 {`
- 🟠 **Línea 19:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-2 {`
- 🟠 **Línea 23:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-3 {`
- 🟠 **Línea 50:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`

### 📄 app/features/admin/claims/admin-claim-detail.page.ts
- 🟠 **Línea 51:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/admin/claims/admin-claims.page.ts
- 🟠 **Línea 31:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/admin/dashboard/admin-dashboard.page.html
- 🟠 **Línea 248:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-4 md:grid-cols-2">`
- 🟠 **Línea 313:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="mt-2 grid gap-2 text-xs text-slate-500 dark:text-text-secondary/60 md:grid-cols-3"...`

### 📄 app/features/admin/database-export/database-export.page.ts
- 🟠 **Línea 45:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"`

### 📄 app/features/admin/disputes/admin-disputes.page.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 15:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-3 {`
- 🟠 **Línea 19:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-4 {`
- 🟠 **Línea 54:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 64:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5rem;`
- 🟠 **Línea 69:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`

### 📄 app/features/admin/fgo/fgo-overview.page.css
- 🔵 **Línea 123:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 234:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 334:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 338:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🟠 **Línea 635:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 697:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 80px;`

### 📄 app/features/admin/refunds/admin-refunds.page.html
- 🟠 **Línea 515:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>`
- 🟠 **Línea 652:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>`

### 📄 app/features/admin/reviews/admin-reviews.page.ts
- 🟠 **Línea 30:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 165:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 rounded border-border-muted"`
- 🟠 **Línea 204:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-warning-400"`

### 📄 app/features/admin/verifications/admin-verifications.page.html
- 🟠 **Línea 12:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">`
- 🟠 **Línea 110:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid grid-cols-1 gap-6 md:grid-cols-2">`

### 📄 app/features/auth/login/login.page.html
- 🟠 **Línea 54:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902...`
- 🟠 **Línea 56:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902...`
- 🟠 **Línea 58:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902...`
- 🟠 **Línea 236:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...`
- 🟠 **Línea 242:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...`

### 📄 app/features/auth/mercadopago-callback.page.ts
- 🔵 **Línea 100:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 80px;`
- 🟠 **Línea 125:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/features/auth/reset-password/reset-password.page.html
- 🟠 **Línea 160:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...`
- 🟠 **Línea 183:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentCo...`
- 🟠 **Línea 189:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentCo...`
- 🟠 **Línea 195:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentCo...`

### 📄 app/features/become-renter/become-renter.page.css
- 🔵 **Línea 8:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🔵 **Línea 29:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 44:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 111:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 112:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 116:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 117:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/features/bookings/booking-detail/booking-detail.page.css
- 🟠 **Línea 48:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 71:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 286:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 459:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 496:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.45;`
- 🟠 **Línea 501:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 555:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 628:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 2px;`
- 🟠 **Línea 689:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 696:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/features/bookings/booking-detail/booking-detail.page.html
- 🟠 **Línea 25:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 1192:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/booking-detail/booking-pricing-breakdown.component.ts
- 🟠 **Línea 58:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted hover:text-text-secondary dark:hover:text-gray-500 cursor-help"...`
- 🟠 **Línea 170:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default hover:text-cta-default dark:hover:text-cta-default cursor-help"...`
- 🟠 **Línea 207:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/features/bookings/booking-detail-payment/booking-detail-payment.page.css
- 🟠 **Línea 30:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: block !important;`
- 🟠 **Línea 32:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: black !important;`
- 🟠 **Línea 34:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0 !important;`
- 🟠 **Línea 45:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: none !important;`
- 🟠 **Línea 47:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 0 !important;`
- 🟠 **Línea 54:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: white !important;`

### 📄 app/features/bookings/booking-detail-payment/booking-detail-payment.page.html
- 🟠 **Línea 162:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-secondary/70"`
- 🟠 **Línea 383:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 423:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 446:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 477:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-primary-500"`
- 🟠 **Línea 583:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 601:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/booking-detail-payment/components/booking-summary-card.component.ts
- 🟠 **Línea 197:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted dark:text-text-secondary/60 cursor-help"`
- 🟠 **Línea 260:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default dark:text-cta-default mt-0.5"`

### 📄 app/features/bookings/booking-detail-payment/components/coverage-upgrade-selector.component.ts
- 🟠 **Línea 156:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default mt-0.5 flex-shrink-0"`

### 📄 app/features/bookings/booking-detail-payment/components/dynamic-price-breakdown-modal.component.ts
- 🟠 **Línea 264:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🟠 **Línea 434:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/features/bookings/booking-detail-payment/components/dynamic-price-lock-panel.component.ts
- 🔵 **Línea 337:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 14px;`

### 📄 app/features/bookings/booking-detail-payment/components/payment-mode-toggle.component.ts
- 🟠 **Línea 131:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-success-light dark:text-success-strong"`
- 🟠 **Línea 160:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default dark:text-cta-default"`

### 📄 app/features/bookings/booking-detail-payment/components/payment-summary-panel.component.ts
- 🟠 **Línea 32:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 96:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted dark:text-text-secondary/60 cursor-help"`
- 🟠 **Línea 119:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-warning-text dark:text-warning-400"`
- 🟠 **Línea 250:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted dark:text-text-secondary/60 cursor-help flex-shrink-0 ml-2"...`

### 📄 app/features/bookings/booking-detail-payment/components/risk-policy-table.component.ts
- 🟠 **Línea 191:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/booking-detail-payment/components/terms-and-consents.component.ts
- 🟠 **Línea 29:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default dark:focus:ring-blue-400 border-cta-defa...`
- 🟠 **Línea 68:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 text-success-strong focus:ring-success-light dark:focus:ring-success-light borde...`

### 📄 app/features/bookings/booking-payment/booking-payment.page.css
- 🟠 **Línea 44:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `position: relative !important;`

### 📄 app/features/bookings/booking-payment/booking-payment.page.html
- 🟠 **Línea 48:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="inline w-4 h-4 mr-1"`
- 🟠 **Línea 205:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 mt-0.5 text-success-strong" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/features/bookings/booking-success/booking-success.page.scss
- 🟠 **Línea 77:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 80px !important;`

### 📄 app/features/bookings/check-in/check-in.page.html
- 🟠 **Línea 44:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/check-out/check-out.page.html
- 🟠 **Línea 44:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/claims/my-claims.page.css
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 111:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 186:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 215:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🟠 **Línea 345:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 365:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 415:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 14px;`

### 📄 app/features/bookings/components/booking-confirmation-step/booking-confirmation-step.component.ts
- 🔵 **Línea 333:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`

### 📄 app/features/bookings/components/booking-dates-step/booking-dates-step.component.scss
- 🔵 **Línea 40:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 75px;`
- 🟠 **Línea 204:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 227:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 60px;`

### 📄 app/features/bookings/components/booking-insurance-step/booking-insurance-step.component.scss
- 🟠 **Línea 187:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/features/bookings/components/booking-review-step/booking-review-step.component.ts
- 🔵 **Línea 153:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 90px;`

### 📄 app/features/bookings/components/booking-step-indicator/booking-step-indicator.component.scss
- 🔵 **Línea 15:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🔵 **Línea 89:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 132:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 app/features/bookings/contracts/contracts-management.page.scss
- 🟠 **Línea 31:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 36:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5rem;`
- 🟠 **Línea 41:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 46:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`

### 📄 app/features/bookings/disputes/disputes-management.page.scss
- 🟠 **Línea 27:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 37:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5rem;`
- 🟠 **Línea 42:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 47:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 124:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 129:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.md\:grid-cols-3 {`

### 📄 app/features/bookings/insurance-selector/insurance-selector.component.ts
- 🟠 **Línea 276:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/features/bookings/my-bookings/my-bookings.page.css
- 🟠 **Línea 85:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 91:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`

### 📄 app/features/bookings/owner-bookings/owner-bookings.page.html
- 🟠 **Línea 133:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-4 md:grid-cols-2">`
- 🟠 **Línea 176:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/features/bookings/owner-check-in/owner-check-in.page.html
- 🔵 **Línea 99:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `style="height: 400px; width: 100%"`

### 📄 app/features/bookings/owner-check-out/owner-check-out.page.css
- 🔵 **Línea 14:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `--handle-height: 26px;`

### 📄 app/features/bookings/owner-damage-report/owner-damage-report.page.css
- 🟠 **Línea 42:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 47:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-3 {`

### 📄 app/features/bookings/pages/booking-checkout/booking-checkout.page.css
- 🔵 **Línea 21:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`
- 🔵 **Línea 26:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 43:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 44:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 70:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🟠 **Línea 86:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 261:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 286:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 496:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 548:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 549:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 557:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 640:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 660:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 676:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 800px;`
- 🟠 **Línea 682:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/features/bookings/pages/booking-confirmation/booking-confirmation.page.css
- 🔵 **Línea 24:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🔵 **Línea 81:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 87:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 123:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 141:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🟠 **Línea 171:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 291:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 312:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 326:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.8;`
- 🟠 **Línea 400:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 401:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 461:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 96px;`

### 📄 app/features/bookings/pages/booking-wizard/booking-wizard.page.scss
- 🔵 **Línea 15:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 45:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 75:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`

### 📄 app/features/bookings/pages/waitlist/waitlist.page.css
- 🟠 **Línea 42:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 122:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/features/bookings/pages/waitlist/waitlist.page.html
- 🟠 **Línea 85:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 97:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/features/bookings/pending-approval/pending-approval.page.scss
- 🔵 **Línea 31:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 368:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 371:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 486:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/features/bookings/report-claim/report-claim.page.ts
- 🟠 **Línea 382:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/features/cars/availability-calendar/availability-calendar.page.css
- 🟠 **Línea 9:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 100% !important;`
- 🟠 **Línea 11:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-shadow: none !important;`
- 🟠 **Línea 13:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 17:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important; /* Hide default month header (we have our own) */`
- 🟠 **Línea 21:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 32:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 100% !important;`
- 🟠 **Línea 36:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: none !important;`
- 🟠 **Línea 38:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `line-height: 3.5rem !important;`
- 🟠 **Línea 40:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0.25rem !important;`
- 🟠 **Línea 46:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #e0f2fe !important;`
- 🟠 **Línea 52:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #10b981 !important;`
- 🟠 **Línea 54:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: #10b981 !important;`
- 🟠 **Línea 59:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #059669 !important;`
- 🟠 **Línea 65:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #ef4444 !important;`
- 🟠 **Línea 67:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: #ef4444 !important;`
- 🟠 **Línea 72:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #dc2626 !important;`
- 🟠 **Línea 77:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #e5e7eb !important;`
- 🟠 **Línea 79:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `cursor: not-allowed !important;`
- 🟠 **Línea 83:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #e5e7eb !important;`
- 🟠 **Línea 92:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #0891b2 !important;`
- 🟠 **Línea 94:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: #0891b2 !important;`
- 🟠 **Línea 101:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #0e7490 !important;`
- 🟠 **Línea 106:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: #0891b2 !important;`
- 🟠 **Línea 121:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #1e293b !important;`
- 🟠 **Línea 125:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: #374151 !important;`
- 🟠 **Línea 133:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 2.5rem !important;`

### 📄 app/features/cars/availability-calendar/availability-calendar.page.html
- 🟠 **Línea 245:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-success-light"></div>`
- 🟠 **Línea 251:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-error-bg0"></div>`
- 🟠 **Línea 257:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-surface-pressed"></div>`
- 🟠 **Línea 261:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded border-2 border-border-muted"></div>`

### 📄 app/features/cars/bulk-blocking/bulk-blocking.page.scss
- 🟠 **Línea 31:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 36:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 98:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`

### 📄 app/features/cars/conversion/cars-conversion.page.css
- 🟠 **Línea 32:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 40:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 94:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 106:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/features/cars/list/cars-list.page.css
- 🟠 **Línea 231:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🔵 **Línea 391:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`
- 🔵 **Línea 414:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 400px;`
- 🔵 **Línea 463:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 350px;`
- 🟠 **Línea 552:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 556:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 576:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🟠 **Línea 611:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🟠 **Línea 619:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `top: auto !important;`
- 🔵 **Línea 620:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 140px;`
- 🔵 **Línea 624:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 96px;`
- 🟠 **Línea 626:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `flex-wrap: nowrap !important;`
- 🟠 **Línea 630:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 88px !important;`
- 🔵 **Línea 630:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 88px !important;`
- 🔵 **Línea 632:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 88px;`

### 📄 app/features/cars/list/cars-list.page.html
- 🟠 **Línea 238:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8"`
- 🟠 **Línea 258:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-6 grid-view"...`
- 🔵 **Línea 540:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `style="top: auto; max-height: 140px;"`
- 🔵 **Línea 553:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `style="-webkit-overflow-scrolling: touch; height: 96px;"`

### 📄 app/features/cars/my-cars/my-cars.page.css
- 🟠 **Línea 74:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 1rem !important;`
- 🟠 **Línea 117:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid.lg\\:grid-cols-3 {`
- 🟠 **Línea 123:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid.md\\:grid-cols-2 {`
- 🟠 **Línea 127:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid.md\\:grid-cols-3 {`

### 📄 app/features/cars/my-cars/my-cars.page.html
- 🟠 **Línea 520:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-3 sm:grid-cols-2">`
- 🟠 **Línea 672:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">`

### 📄 app/features/cars/publish/publish-car-v2.page.html
- 🟠 **Línea 35:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-8 lg:grid-cols-12 items-start">`
- 🟠 **Línea 94:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 128:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 161:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 241:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 302:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 378:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 426:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 452:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 477:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 582:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 667:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 700:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 726:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`
- 🟠 **Línea 752:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`

### 📄 app/features/cars/vehicle-documents/vehicle-documents.page.css
- 🔵 **Línea 19:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 37:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 38:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 76:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 106:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 130:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 247:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 252:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 354:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 359:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 405:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🟠 **Línea 421:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 422:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/features/contracts/components/contract-pdf-viewer.component.ts
- 🔵 **Línea 51:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 600px;`
- 🔵 **Línea 97:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 400px;`

### 📄 app/features/contracts/components/contract-sign-modal.component.ts
- 🔵 **Línea 351:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 400px;`
- 🟠 **Línea 354:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 482:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 300px;`

### 📄 app/features/dashboard/calendar/calendar.page.html
- 🟠 **Línea 66:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-success-light"></div>`
- 🟠 **Línea 70:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-warning-light"></div>`
- 🟠 **Línea 74:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-primary-600"></div>`
- 🟠 **Línea 78:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 rounded bg-gray-500"></div>`

### 📄 app/features/dashboard/components/multi-car-calendar/multi-car-calendar.component.css
- 🟠 **Línea 27:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-7 > div {`
- 🟠 **Línea 33:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-7 > div {`

### 📄 app/features/driver-profile/driver-profile.page.ts
- 🔵 **Línea 414:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 481:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 504:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 100px;`
- 🟠 **Línea 580:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🟠 **Línea 607:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 664:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🟠 **Línea 786:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 811:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 140px;`
- 🔵 **Línea 869:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 12px;`
- 🔵 **Línea 949:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 986:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🟠 **Línea 1016:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🔵 **Línea 1055:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 3px;`
- 🔵 **Línea 1114:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 1240:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 1269:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 1303:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 1315:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 1338:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 1352:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 120px;`
- 🔵 **Línea 1367:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 100px;`
- 🟠 **Línea 1392:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: 0.01ms !important;`
- 🟠 **Línea 1394:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition-duration: 0.01ms !important;`

### 📄 app/features/experiences/communication/chat-shell/chat-shell.component.html
- 🟠 **Línea 152:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"`
- 🟠 **Línea 164:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"`
- 🟠 **Línea 176:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-cta-default"`

### 📄 app/features/explore/explore.page.html
- 🔵 **Línea 6:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `<ion-toolbar class="--background: transparent; --min-height: 80px;">`
- 🟠 **Línea 58:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">`
- 🟠 **Línea 75:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">`

### 📄 app/features/explore/explore.page.scss
- 🔵 **Línea 153:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 160px;`
- 🔵 **Línea 190:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 140px;`
- 🟠 **Línea 213:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: #22c55e !important;`
- 🟠 **Línea 214:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-shadow: 0 6px 28px rgba(34, 197, 94, 0.4) !important;`
- 🔵 **Línea 224:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 228:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 232:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-inline-start: 16px !important;`

### 📄 app/features/favorites/favorites.page.ts
- 🔵 **Línea 195:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`
- 🔵 **Línea 201:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 283:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 200px;`
- 🔵 **Línea 349:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`

### 📄 app/features/marketplace/components/bottom-sheet-filters/bottom-sheet-filters.component.ts
- 🔵 **Línea 223:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`

### 📄 app/features/marketplace/components/faq-section/faq-section.component.ts
- 🔵 **Línea 215:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 245:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/features/marketplace/components/layout/facebook-sidebar.component.ts
- 🔵 **Línea 263:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🔵 **Línea 302:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🔵 **Línea 326:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🔵 **Línea 364:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 390:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `min-width: 20px;`
- 🔵 **Línea 423:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 539:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🟠 **Línea 606:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 607:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/features/marketplace/components/ui/badge.component.ts
- 🟠 **Línea 42:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🔵 **Línea 73:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 80:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🟠 **Línea 84:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 10px;`
- 🔵 **Línea 85:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 10px;`

### 📄 app/features/marketplace/components/ui/bottom-sheet.component.ts
- 🔵 **Línea 151:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🟠 **Línea 191:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition: none !important;`

### 📄 app/features/marketplace/components/ui/button.component.ts
- 🔵 **Línea 80:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 36px;`
- 🔵 **Línea 86:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🔵 **Línea 92:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 52px;`
- 🟠 **Línea 148:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 149:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 177:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 178:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 182:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`

### 📄 app/features/marketplace/components/ui/chip.component.ts
- 🔵 **Línea 141:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 153:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🟠 **Línea 163:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🔵 **Línea 173:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/features/marketplace/components/ui/fab.component.ts
- 🔵 **Línea 64:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🔵 **Línea 71:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 77:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🟠 **Línea 127:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🔵 **Línea 136:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 146:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`

### 📄 app/features/marketplace/components/ui/input.component.ts
- 🔵 **Línea 173:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🔵 **Línea 182:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 88px;`
- 🟠 **Línea 183:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 190:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 191:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 246:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 36px;`
- 🔵 **Línea 252:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 52px;`

### 📄 app/features/marketplace/components/ui/modal.component.ts
- 🔵 **Línea 174:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 200:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🟠 **Línea 219:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 220:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/features/marketplace/components/ui/skeleton.component.ts
- 🔵 **Línea 67:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 200px;`
- 🔵 **Línea 71:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 83:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 88:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`

### 📄 app/features/marketplace/components/ui/toast.component.ts
- 🔵 **Línea 186:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 216:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🟠 **Línea 230:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 236:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 261:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 262:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 285:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 3px;`

### 📄 app/features/marketplace/components/urgency-banner/urgency-banner.component.ts
- 🔵 **Línea 110:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 148:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`

### 📄 app/features/marketplace/marketplace-v2.page.css
- 🟠 **Línea 109:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `filter: none !important;`
- 🔵 **Línea 288:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🔵 **Línea 417:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🟠 **Línea 590:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: rgba(125, 211, 224, 0.15) !important;`
- 🟠 **Línea 592:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary) !important;`
- 🔵 **Línea 618:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🟠 **Línea 690:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: var(--cta-default) !important;`
- 🟠 **Línea 694:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `var(--elevation-3) !important;`
- 🔵 **Línea 704:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 150px;`
- 🔵 **Línea 777:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 180px;`
- 🔵 **Línea 846:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🟠 **Línea 863:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 890:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 926:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`
- 🔵 **Línea 1020:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 1034:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary, #050505) !important;`
- 🟠 **Línea 1039:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: white !important;`
- 🔵 **Línea 1087:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 1143:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🔵 **Línea 1167:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 72px;`
- 🟠 **Línea 1190:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.7;`
- 🔵 **Línea 1229:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 100px;`
- 🔵 **Línea 1264:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🟠 **Línea 1285:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 1360:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🟠 **Línea 1600:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.1;`
- 🟠 **Línea 1675:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 1.25rem !important;`
- 🟠 **Línea 1708:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(2, 1fr) !important; /* 2 columns on mobile */`
- 🟠 **Línea 1716:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: 1fr !important; /* 1 column on tiny screens */`
- 🔵 **Línea 1722:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 100px; /* Ensure sufficient touch target */`
- 🟠 **Línea 1727:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: 1fr !important;`
- 🟠 **Línea 1733:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: 1fr !important;`
- 🟠 **Línea 1776:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(3, 1fr) !important;`
- 🟠 **Línea 1792:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(4, 1fr) !important;`
- 🟠 **Línea 1803:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(4, 1fr) !important;`
- 🔵 **Línea 1811:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `@media (max-height: 600px) and (orientation: landscape) {`
- 🟠 **Línea 1825:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 0.75rem !important;`
- 🟠 **Línea 1881:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.sm\:grid-cols-2 {`
- 🟠 **Línea 1882:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(3, 1fr) !important;`
- 🟠 **Línea 1889:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 2rem !important;`
- 🔵 **Línea 1904:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🟠 **Línea 1991:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: 0.01ms !important;`
- 🟠 **Línea 1993:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition-duration: 0.01ms !important;`
- 🔵 **Línea 2156:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🔵 **Línea 2168:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🔵 **Línea 2174:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 2223:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`

### 📄 app/features/marketplace/marketplace-v2.page.html
- 🟠 **Línea 511:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 text-cta-default" viewBox="0 0 24 24" fill="none"`

### 📄 app/features/mp-callback/mp-callback.page.ts
- 🟠 **Línea 149:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 193:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 233:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/features/notifications/notifications.page.css
- 🔵 **Línea 88:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 196:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 230:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 244:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 258:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 14px;`
- 🔵 **Línea 269:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 282:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🔵 **Línea 336:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`

### 📄 app/features/notifications/notifications.page.ts
- 🟠 **Línea 134:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 rounded border-border-muted text-cta-default focus:ring-2 focus:ring-cta-default dark...`

### 📄 app/features/payouts/payout-stats/payout-stats.component.ts
- 🟠 **Línea 21:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid grid-cols-2 gap-4 md:grid-cols-3">`

### 📄 app/features/profile/components/profile-header/profile-header.component.css
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 150px;`
- 🔵 **Línea 147:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`

### 📄 app/features/profile/components/sections/contact/profile-contact-section.component.scss
- 🔵 **Línea 12:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 268:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `@apply grid-cols-1;`

### 📄 app/features/profile/components/shared/section-card/section-card.component.scss
- 🔵 **Línea 107:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 134:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`

### 📄 app/features/profile/driving-stats/driving-stats.page.css
- 🔵 **Línea 19:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 37:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 38:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 68:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 97:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px;`
- 🔵 **Línea 182:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 160px;`
- 🟠 **Línea 229:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 284:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 330:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 386:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 508:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 140px;`

### 📄 app/features/profile/location-settings.page.css
- 🟠 **Línea 37:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 336:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/features/profile/mercadopago-connect.component.css
- 🟠 **Línea 247:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 277:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 356:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/features/profile/notifications-settings/notifications-settings.page.css
- 🔵 **Línea 19:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 37:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 38:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 119:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 143:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🔵 **Línea 168:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 169:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🟠 **Línea 205:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 206:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 216:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 265:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`

### 📄 app/features/profile/personal/profile-personal.page.ts
- 🟠 **Línea 77:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 animate-spin"`
- 🟠 **Línea 91:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4"`
- 🟠 **Línea 217:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"`
- 🟠 **Línea 238:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"`
- 🟠 **Línea 259:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"`

### 📄 app/features/profile/profile-expanded.page.css
- 🔵 **Línea 10:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 94:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 2px;`

### 📄 app/features/profile/profile-expanded.page.html
- 🟠 **Línea 410:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary/70 group-hover:text-success-strong group...`
- 🟠 **Línea 459:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary/70 group-hover:text-warning-strong group...`
- 🟠 **Línea 508:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary/70 group-hover:text-cta-default group-ho...`

### 📄 app/features/profile/profile.page.css
- 🔵 **Línea 127:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`

### 📄 app/features/profile/verification-page/components/dni-uploader.component.ts
- 🟠 **Línea 47:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 106:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/features/profile/verification-page/profile-verification.page.ts
- 🟠 **Línea 76:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 155:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 167:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 256:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 309:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 362:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 374:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 447:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 458:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 transition-transform group-open:rotate-180"`

### 📄 app/features/protections/protections.page.ts
- 🟠 **Línea 217:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 241:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 292:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/features/users/public-profile.page.html
- 🟠 **Línea 97:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/features/verification/verification.page.ts
- 🟠 **Línea 148:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<section class="grid gap-4 md:grid-cols-3 mb-8">`

### 📄 app/features/wallet/wallet.page.html
- 🟠 **Línea 41:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-8 lg:grid-cols-5 items-start">`
- 🟠 **Línea 183:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-6 lg:grid-cols-3 items-center pr-8">`
- 🟠 **Línea 202:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-4 sm:grid-cols-3">`
- 🟠 **Línea 269:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<section class="grid gap-4 lg:grid-cols-2">`
- 🟠 **Línea 385:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-3 sm:grid-cols-2">`
- 🟠 **Línea 588:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<section class="grid gap-6 lg:grid-cols-3">`
- 🟠 **Línea 627:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-4 sm:grid-cols-3">`

### 📄 app/shared/components/autorentar-credit-card/autorentar-credit-card.component.html
- 🟠 **Línea 61:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 75:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/shared/components/base-chat/base-chat.component.ts
- 🟠 **Línea 180:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"...`
- 🟠 **Línea 192:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"...`
- 🟠 **Línea 204:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-cta-default"`

### 📄 app/shared/components/block-date-modal/block-date-modal.component.ts
- 🟠 **Línea 137:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 w-4 h-4 text-cta-default border-border-default rounded focus:ring-cta-default"...`
- 🟠 **Línea 212:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: var(--cta-default) !important;`

### 📄 app/shared/components/bonus-protector-purchase/bonus-protector-purchase.component.html
- 🟠 **Línea 98:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-success-strong mr-2 flex-shrink-0 mt-0.5"`
- 🟠 **Línea 113:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-success-strong mr-2 flex-shrink-0 mt-0.5"`
- 🟠 **Línea 127:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-success-strong mr-2 flex-shrink-0 mt-0.5"`

### 📄 app/shared/components/bonus-protector-simulator/bonus-protector-simulator.component.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 40:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 45:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 50:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`

### 📄 app/shared/components/booking-chat/booking-chat.component.html
- 🟠 **Línea 148:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"`
- 🟠 **Línea 160:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"`
- 🟠 **Línea 172:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-cta-default"`

### 📄 app/shared/components/booking-confirmation-timeline/booking-confirmation-timeline.component.html
- 🟠 **Línea 21:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 171:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted"`
- 🟠 **Línea 187:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-text-muted"`

### 📄 app/shared/components/booking-contract/booking-contract.component.ts
- 🟠 **Línea 91:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"...`

### 📄 app/shared/components/bottom-sheet/bottom-sheet.component.css
- 🔵 **Línea 21:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 180px;`

### 📄 app/shared/components/button/button.component.ts
- 🟠 **Línea 40:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="animate-spin h-4 w-4 mr-2"`

### 📄 app/shared/components/car-card/car-card.component.css
- 🔵 **Línea 106:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`

### 📄 app/shared/components/car-card/car-card.component.html
- 🟠 **Línea 126:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusa...`
- 🟠 **Línea 138:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusa...`
- 🟠 **Línea 150:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusa...`

### 📄 app/shared/components/cars-drawer/cars-drawer.component.ts
- 🟠 **Línea 81:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="drawer-cards grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"`

### 📄 app/shared/components/maps/cars-map/cars-map.component.css
- 🔵 **Línea 110:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 130:** ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).
  `font-size: 9px;`
- 🟠 **Línea 179:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 229:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 2000 !important;`
- 🟠 **Línea 293:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 294:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 310:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 341:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 352:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 1000 !important; /* Asegurar que esté por encima de otros elementos */`
- 🟠 **Línea 356:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 3px 4px !important; /* Reducido 4x (antes 12px 16px) */`
- 🟠 **Línea 358:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `-webkit-border-radius: 4px !important;`
- 🟠 **Línea 362:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Fondo blanco en light mode */`
- 🟠 **Línea 363:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-dark, #1a1a1a) !important; /* Texto oscuro para contraste */`
- 🟠 **Línea 367:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Reducido 4x */`
- 🟠 **Línea 368:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 1000 !important; /* Asegurar que esté por encima */`
- 🟠 **Línea 370:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `overflow: hidden !important; /* Asegurar que el contenido respete los bordes redondeados */`
- 🟠 **Línea 372:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-sizing: border-box !important; /* Incluir padding en el ancho */`
- 🟠 **Línea 378:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: var(--surface-dark, #1e1e1e) !important; /* Fondo gris oscuro en dark mode */`
- 🟠 **Línea 383:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Sombra más intensa */`
- 🟠 **Línea 385:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `var(--border-light-alpha-15, var(--border-light-alpha-15, rgba(255, 255, 255, 0.15))) !important; /*...`
- 🔵 **Línea 397:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px; /* Reducido 4x (antes 66px) */`
- 🟠 **Línea 400:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `overflow: hidden !important;`
- 🟠 **Línea 415:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 22px !important; /* Reducido 4x (antes 88px) */`
- 🔵 **Línea 416:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px !important; /* Reducido 4x (antes 66px) */`
- 🟠 **Línea 417:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-width: 22px !important;`
- 🔵 **Línea 418:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 16px !important;`
- 🟠 **Línea 419:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 22px !important;`
- 🔵 **Línea 420:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 16px !important;`
- 🟠 **Línea 421:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `object-fit: cover !important;`
- 🟠 **Línea 423:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 2.5px !important; /* Reducido 4x (antes 10px) */`
- 🟠 **Línea 426:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `clip-path: inset(0 round 2.5px) !important;`
- 🟠 **Línea 429:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0 !important;`
- 🟠 **Línea 432:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: translateZ(0) !important;`
- 🟠 **Línea 434:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `will-change: transform !important;`
- 🟠 **Línea 436:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `-webkit-backface-visibility: hidden !important;`
- 🟠 **Línea 438:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-sizing: border-box !important;`
- 🟠 **Línea 442:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-dark, #1a1a1a) !important; /* Color base oscuro para light mode */`
- 🟠 **Línea 446:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-white, #ffffff) !important; /* Color base blanco para dark mode */`
- 🟠 **Línea 456:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0 0 1px 0 !important; /* Reducido 4x (antes 0 0 4px 0) */`
- 🟠 **Línea 458:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-weight: 600 !important;`
- 🟠 **Línea 459:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-dark, #1a1a1a) !important; /* Oscuro para light mode */`
- 🟠 **Línea 460:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3 !important;`
- 🟠 **Línea 461:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: block !important;`
- 🟠 **Línea 463:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `opacity: 1 !important;`
- 🟠 **Línea 473:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-white, #ffffff) !important; /* Blanco para contraste en dark mode */`
- 🟠 **Línea 477:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-muted, #4b4b4b) !important; /* Gris medio para texto secundario en light mode */`
- 🟠 **Línea 480:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 487:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Gris claro para texto secundario en dark mode */`
- 🔵 **Línea 492:** ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).
  `font-size: 4px; /* Reducido 4x (antes 16px) */`
- 🟠 **Línea 494:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--cta-default) !important; /* Azul pastel del sistema */`
- 🟠 **Línea 495:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 499:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--cta-light, #60a5fa) !important; /* Azul claro para precio en dark mode */`
- 🟠 **Línea 506:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: calc(100vw - 12px) !important; /* Dejar 6px de margen a cada lado */`
- 🟠 **Línea 508:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 1.5px 2px !important; /* Reducido 8x (antes 12px 16px) */`
- 🟠 **Línea 514:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-width: auto !important;`
- 🟠 **Línea 516:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 1.5px !important; /* Reducido 8x (antes 12px) */`
- 🟠 **Línea 518:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-sizing: border-box !important;`
- 🟠 **Línea 523:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 11px !important; /* Reducido 8x (antes 88px) */`
- 🔵 **Línea 524:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px !important; /* Reducido 8x (antes 66px) */`
- 🟠 **Línea 525:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `flex-shrink: 0 !important;`
- 🟠 **Línea 527:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-height: 8px !important;`
- 🔵 **Línea 527:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 8px !important;`
- 🟠 **Línea 529:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 1.25px !important; /* Reducido 8x (antes 10px) */`
- 🟠 **Línea 540:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 11px !important;`
- 🔵 **Línea 541:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px !important;`
- 🟠 **Línea 542:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-width: 11px !important;`
- 🔵 **Línea 543:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 8px !important;`
- 🟠 **Línea 544:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 11px !important;`
- 🔵 **Línea 545:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 8px !important;`
- 🟠 **Línea 546:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-sizing: border-box !important;`
- 🟠 **Línea 548:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 1.25px !important; /* Reducido 8x */`
- 🟠 **Línea 549:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `clip-path: inset(0 round 1.25px) !important;`
- 🟠 **Línea 554:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `flex: 1 !important;`
- 🟠 **Línea 556:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: calc(100% - 12.5px) !important; /* 11px imagen + 1.5px gap */`
- 🟠 **Línea 558:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-sizing: border-box !important;`
- 🟠 **Línea 562:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.75px !important; /* Reducido 8x (antes 14px) */`
- 🟠 **Línea 564:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `white-space: nowrap !important;`
- 🟠 **Línea 566:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `text-overflow: ellipsis !important;`
- 🟠 **Línea 568:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0 0 0.5px 0 !important; /* Reducido 8x */`
- 🟠 **Línea 569:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2 !important;`
- 🔵 **Línea 573:** ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).
  `font-size: 2px !important; /* Reducido 8x (antes 16px) */`
- 🟠 **Línea 573:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 2px !important; /* Reducido 8x (antes 16px) */`
- 🟠 **Línea 575:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3 !important;`
- 🟠 **Línea 575:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `line-height: 1.3 !important;`
- 🟠 **Línea 579:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.625px !important; /* Reducido 8x (antes 13px) */`
- 🟠 **Línea 581:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `overflow: hidden !important;`
- 🟠 **Línea 583:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 100% !important;`
- 🟠 **Línea 585:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2 !important;`
- 🟠 **Línea 585:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `line-height: 1.2 !important;`
- 🟠 **Línea 594:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important;`
- 🟠 **Línea 598:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important;`
- 🟠 **Línea 603:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-top-color: var(--surface-dark, #1e1e1e) !important;`
- 🟠 **Línea 610:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 3.5px 4.5px !important; /* Reducido 4x (antes 14px 18px) */`
- 🟠 **Línea 612:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `-webkit-border-radius: 4.5px !important;`
- 🟠 **Línea 616:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: var(--surface-dark, #1e1e1e) !important;`
- 🟠 **Línea 620:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Reducido 4x */`
- 🟠 **Línea 633:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-white, #ffffff) !important;`
- 🟠 **Línea 641:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--cta-light, #60a5fa) !important;`
- 🔵 **Línea 652:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🟠 **Línea 677:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: var(--surface-dark, #1e1e1e) !important;`
- 🟠 **Línea 681:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important;`
- 🟠 **Línea 682:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-white, #ffffff) !important;`
- 🟠 **Línea 686:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important;`
- 🟠 **Línea 690:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: var(--surface-hover-dark, #2a2a2a) !important;`
- 🟠 **Línea 694:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important;`
- 🟠 **Línea 698:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 699:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 1009:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 1101:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 1130:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1131:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 1205:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1206:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 1248:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 1264:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`
- 🟠 **Línea 1271:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1272:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 1327:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1328:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 1356:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 1404:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🟠 **Línea 1434:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1435:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 1536:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`

### 📄 app/shared/components/maps/cars-map/cars-map.component.ts
- 🔵 **Línea 1611:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `<div style="width: 8px; height: 8px; background-color: var(--success-default, #10b981); border-radiu...`

### 📄 app/shared/components/claim-form/claim-form.component.css
- 🔵 **Línea 283:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 80px;`
- 🟠 **Línea 303:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 304:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 307:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 433:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/class-benefits-modal/class-benefits-modal.component.css
- 🔵 **Línea 34:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`

### 📄 app/shared/components/class-benefits-modal/class-benefits-modal.component.ts
- 🟠 **Línea 356:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/shared/components/damage-comparison/damage-comparison.component.scss
- 🟠 **Línea 32:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 37:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5rem;`
- 🟠 **Línea 42:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 47:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`
- 🟠 **Línea 106:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`

### 📄 app/shared/components/dark-mode-toggle/dark-mode-toggle.component.ts
- 🔵 **Línea 86:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 113:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 114:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 121:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 122:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 139:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 150:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 155:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`

### 📄 app/shared/components/date-range-picker/date-range-picker.component.css
- 🔵 **Línea 285:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🔵 **Línea 290:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 361:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 375:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🟠 **Línea 490:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: var(--surface-raised) !important;`
- 🟠 **Línea 493:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;`
- 🟠 **Línea 495:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: var(--radius-lg) !important;`
- 🟠 **Línea 497:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 50 !important;`
- 🟠 **Línea 503:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-bottom-color: var(--surface-raised) !important;`
- 🟠 **Línea 508:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-top-color: var(--surface-raised) !important;`
- 🟠 **Línea 513:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 518:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 520:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `fill: var(--text-primary) !important;`
- 🟠 **Línea 525:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-secondary) !important;`
- 🟠 **Línea 531:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--cta-default) !important;`
- 🟠 **Línea 537:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 14px !important;`
- 🔵 **Línea 538:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 14px !important;`
- 🟠 **Línea 539:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `fill: inherit !important;`
- 🟠 **Línea 544:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 548:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-secondary) !important;`
- 🟠 **Línea 554:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary) !important;`
- 🟠 **Línea 556:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border: 1px solid transparent !important;`
- 🟠 **Línea 563:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: var(--surface-hover) !important;`
- 🟠 **Línea 568:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: var(--cta-default) !important;`
- 🟠 **Línea 592:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Replaced gradient with solid color token */`
- 🟠 **Línea 593:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: transparent !important;`
- 🟠 **Línea 595:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-shadow: 0 4px 6px -1px rgba(0, 217, 225, 0.3) !important;`
- 🟠 **Línea 599:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: rgba(0, 217, 225, 0.15) !important; /* Cyan with low opacity */`
- 🟠 **Línea 603:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `5px 0 0 rgba(0, 217, 225, 0.15) !important;`
- 🟠 **Línea 609:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-disabled) !important;`
- 🟠 **Línea 611:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-color: transparent !important;`
- 🟠 **Línea 620:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;`

### 📄 app/shared/components/date-range-picker/date-range-picker.component.html
- 🟠 **Línea 88:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="fals...`
- 🟠 **Línea 111:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 127:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 232:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/distance-summary/distance-summary.component.css
- 🟠 **Línea 115:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 122:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 129:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/shared/components/driver-profile-card/driver-profile-card.component.html
- 🟠 **Línea 65:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div *ngIf="showDetails" class="grid grid-cols-2 gap-4" [class.grid-cols-1]="compact">`

### 📄 app/shared/components/driver-profile-card/driver-profile-card.component.ts
- 🟠 **Línea 430:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 459:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`

### 📄 app/shared/components/dynamic-price-display/dynamic-price-display.component.ts
- 🟠 **Línea 60:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 transition-transform"`

### 📄 app/shared/components/earnings-card/earnings-card.component.html
- 🟠 **Línea 54:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4"`
- 🟠 **Línea 68:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4"`

### 📄 app/shared/components/email-verification/email-verification.component.ts
- 🟠 **Línea 86:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 99:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>`

### 📄 app/shared/components/enhanced-map-tooltip/enhanced-map-tooltip.component.ts
- 🟠 **Línea 181:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 208:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/favorite-button/favorite-button.component.ts
- 🔵 **Línea 32:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 65:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1;`
- 🟠 **Línea 70:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 71:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 104:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`

### 📄 app/shared/components/floating-action-fab/floating-action-fab.component.css
- 🔵 **Línea 27:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`

### 📄 app/shared/components/footer/footer.component.css
- 🟠 **Línea 92:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 274:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 324:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`

### 📄 app/shared/components/guarantee-options-info/guarantee-options-info.component.html
- 🟠 **Línea 56:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-3 sm:grid-cols-2">`
- 🟠 **Línea 90:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-border-default/30 dark:bg-surface-se...`
- 🟠 **Línea 135:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-surface-raised dark:bg-surface-raise...`
- 🟠 **Línea 164:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-border-default/30 dark:bg-surface-se...`
- 🟠 **Línea 213:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-surface-raised dark:bg-surface-raise...`
- 🟠 **Línea 242:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-border-default/30 dark:bg-surface-se...`
- 🟠 **Línea 271:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `class="grid gap-3 sm:grid-cols-2 items-center p-3 rounded-lg bg-surface-raised dark:bg-surface-raise...`
- 🟠 **Línea 301:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 383:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-success-text dark:text-success-400 flex-shrink-0"`

### 📄 app/shared/components/help-button/help-button.component.ts
- 🟠 **Línea 157:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`

### 📄 app/shared/components/inspection-uploader/inspection-uploader.component.css
- 🔵 **Línea 234:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🟠 **Línea 243:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 244:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 251:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 252:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 268:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 356:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/language-selector/language-selector.component.ts
- 🟠 **Línea 39:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 transition-transform"`

### 📄 app/shared/components/live-tracking-map/live-tracking-map.component.ts
- 🔵 **Línea 84:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`
- 🔵 **Línea 92:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`
- 🔵 **Línea 115:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 143:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 183:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 224:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 358:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🔵 **Línea 369:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 388:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 56px;`
- 🔵 **Línea 428:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 442:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/loading-state/loading-state.component.ts
- 🟠 **Línea 42:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="animate-spin h-4 w-4 text-text-secondary" viewBox="0 0 24 24">`

### 📄 app/shared/components/location-map-picker/location-map-picker.component.ts
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 400px;`

### 📄 app/shared/components/make-calendar-public-button/make-calendar-public-button.component.ts
- 🟠 **Línea 20:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="animate-spin -ml-1 mr-2 h-4 w-4"`
- 🟠 **Línea 34:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/map-booking-panel/map-booking-panel.component.ts
- 🟠 **Línea 148:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 161:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 210:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 225:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 245:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 262:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/map-controls/map-controls.component.ts
- 🔵 **Línea 76:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`
- 🔵 **Línea 113:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`

### 📄 app/shared/components/map-details-panel/map-details-panel.component.html
- 🟠 **Línea 76:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 93:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/map-drawer/map-drawer.component.css
- 🔵 **Línea 125:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 app/shared/components/map-drawer/map-drawer.component.html
- 🟠 **Línea 112:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`

### 📄 app/shared/components/map-filters/map-filters.component.css
- 🔵 **Línea 86:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 400px;`
- 🔵 **Línea 156:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🔵 **Línea 168:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 183:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 209:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`

### 📄 app/shared/components/map-filters/map-filters.component.html
- 🟠 **Línea 90:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 109:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 128:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 148:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 167:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 252:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 rounded"`
- 🟠 **Línea 391:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 rounded"`

### 📄 app/shared/components/map-layers-control/map-layers-control.component.css
- 🟠 **Línea 70:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `@apply w-4 h-4;`

### 📄 app/shared/components/map-marker/map-marker.component.css
- 🔵 **Línea 4:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 64px; /* Corresponds to h-16 in Tailwind */`

### 📄 app/shared/components/mercadopago-card-form/mercadopago-card-form.component.ts
- 🟠 **Línea 168:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4 text-cta-default flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 2...`
- 🔵 **Línea 185:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`
- 🟠 **Línea 190:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-family: inherit !important;`
- 🟠 **Línea 194:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 0 !important;`

### 📄 app/shared/components/mercadopago-payment-brick/mercadopago-payment-brick.component.ts
- 🔵 **Línea 234:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 200px;`
- 🔵 **Línea 238:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 350px;`
- 🟠 **Línea 243:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 0.75rem !important;`

### 📄 app/shared/components/mobile-bottom-nav/mobile-bottom-nav.component.css
- 🟠 **Línea 3:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `position: fixed !important;`
- 🟠 **Línea 5:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `right: 0 !important;`
- 🟠 **Línea 7:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 100% !important;`
- 🟠 **Línea 9:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 50 !important; /* Aumentado para asegurar que esté por encima */`
- 🟠 **Línea 11:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: block !important;`
- 🟠 **Línea 13:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🟠 **Línea 16:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `contain: layout style paint !important;`
- 🟠 **Línea 19:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin: 0 !important;`
- 🟠 **Línea 30:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🔵 **Línea 81:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🔵 **Línea 116:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 56px;`
- 🔵 **Línea 150:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🔵 **Línea 159:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 26px;`
- 🟠 **Línea 203:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🔵 **Línea 241:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 278:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 286:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 324:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 352:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 353:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 357:** ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).
  `font-size: 8px;`

### 📄 app/shared/components/mp-onboarding-modal/mp-onboarding-modal.component.ts
- 🔵 **Línea 209:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`
- 🟠 **Línea 272:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 278:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 319:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 346:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🔵 **Línea 396:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 56px;`
- 🟠 **Línea 410:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 429:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/shared/components/notifications/notifications.component.css
- 🔵 **Línea 13:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 44px;`
- 🟠 **Línea 42:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 43:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 53:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `min-width: 20px;`
- 🔵 **Línea 54:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 103:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 225:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 244:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 271:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 400px;`
- 🔵 **Línea 287:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 377:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 390:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 409:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 12px;`
- 🔵 **Línea 416:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`
- 🔵 **Línea 430:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 456:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/offline-banner/offline-banner.component.ts
- 🟠 **Línea 103:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 109:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`

### 📄 app/shared/components/owner-confirmation/owner-confirmation.component.html
- 🟠 **Línea 62:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="mt-1 w-4 h-4 text-cta-default bg-slate-100 border-slate-300 rounded focus:ring-cta-default da...`
- 🟠 **Línea 184:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="animate-spin h-4 w-4 text-text-inverse"`

### 📄 app/shared/components/payment-method-buttons/payment-method-buttons.component.html
- 🟠 **Línea 161:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 220:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="inline w-4 h-4 mr-1"`
- 🟠 **Línea 241:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 256:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<div class="w-4 h-4 bg-surface-pressed rounded-full"></div>`

### 📄 app/shared/components/payment-provider-selector/payment-provider-selector.component.css
- 🟠 **Línea 21:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 22:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/shared/components/paypal-button/paypal-button.component.css
- 🔵 **Línea 9:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 45px;`
- 🔵 **Línea 29:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 100px;`
- 🔵 **Línea 34:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 72:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 81:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 118:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 131:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 80px;`
- 🔵 **Línea 136:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 145:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 app/shared/components/personalized-dashboard/personalized-dashboard.component.css
- 🔵 **Línea 24:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`
- 🔵 **Línea 30:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 69:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 75:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 158:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🟠 **Línea 204:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🔵 **Línea 416:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 160px;`

### 📄 app/shared/components/personalized-location/personalized-location.component.css
- 🟠 **Línea 30:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 31:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/shared/components/professional-date-input/professional-date-input.component.css
- 🟠 **Línea 92:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `@apply h-4 w-4 flex-shrink-0;`

### 📄 app/shared/components/professional-date-input/professional-date-input.component.html
- 🟠 **Línea 9:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 text-text-secondary dark:text-text-secondary/70"`
- 🟠 **Línea 70:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/protection-credit-card/protection-credit-card.component.ts
- 🔵 **Línea 290:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 8px;`

### 📄 app/shared/components/protection-credit-explanation-modal/protection-credit-explanation-modal.component.ts
- 🟠 **Línea 259:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🔵 **Línea 308:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 411:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🟠 **Línea 446:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`

### 📄 app/shared/components/pull-to-refresh/pull-to-refresh.component.ts
- 🔵 **Línea 62:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 60px;`
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 86:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`

### 📄 app/shared/components/pwa-capabilities/pwa-capabilities.component.css
- 🔵 **Línea 35:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 46:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 59:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 67:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 71:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 72:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 83:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 4px;`
- 🔵 **Línea 140:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 163:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 171:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 180:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 201:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 202:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 210:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 236:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🟠 **Línea 248:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 249:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/shared/components/pwa-install-banner/pwa-install-banner.component.ts
- 🔵 **Línea 81:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 98:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`

### 📄 app/shared/components/pwa-install-prompt/pwa-install-prompt.component.css
- 🔵 **Línea 40:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 75:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 93:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 155:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 12px;`

### 📄 app/shared/components/pwa-titlebar/pwa-titlebar.component.css
- 🔵 **Línea 51:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 85:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 92:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 123:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 141:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`

### 📄 app/shared/components/pwa-update-prompt/pwa-update-prompt.component.css
- 🔵 **Línea 45:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 56:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 73:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🟠 **Línea 77:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 78:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 93:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 100:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 146:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🟠 **Línea 164:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 165:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 176:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🔵 **Línea 181:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/renter-confirmation/renter-confirmation.component.html
- 🟠 **Línea 147:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 192:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="animate-spin h-4 w-4 text-text-inverse"`

### 📄 app/shared/components/renter-profile-badge/renter-profile-badge.component.ts
- 🔵 **Línea 136:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`

### 📄 app/shared/components/reviews/review-card/review-card.component.html
- 🟠 **Línea 51:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 123:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 143:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 163:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 183:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 203:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 223:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 244:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/reviews/review-radar-chart/review-radar-chart.component.css
- 🔵 **Línea 87:** ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).
  `font-size: 9px;`

### 📄 app/shared/components/risk-calculator-viewer/risk-calculator-viewer.component.scss
- 🟠 **Línea 10:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid-cols-2 {`
- 🟠 **Línea 57:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25rem;`
- 🟠 **Línea 62:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.75rem;`

### 📄 app/shared/components/selfie-capture/selfie-capture.component.ts
- 🔵 **Línea 121:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `style="width: 200px; height: 250px;"`

### 📄 app/shared/components/settlement-simulator/settlement-simulator.component.html
- 🟠 **Línea 24:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"`

### 📄 app/shared/components/share-menu/share-menu.component.css
- 🔵 **Línea 43:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🔵 **Línea 54:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px;`
- 🟠 **Línea 124:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 125:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 140:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 147:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 182:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`

### 📄 app/shared/components/simple-checkout/simple-checkout.component.css
- 🔵 **Línea 50:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`
- 🔵 **Línea 98:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 500px;`
- 🔵 **Línea 124:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`
- 🔵 **Línea 129:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 164:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`
- 🟠 **Línea 187:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 256:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 298:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 14px;`
- 🔵 **Línea 337:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 60px;`
- 🔵 **Línea 471:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 60px;`
- 🟠 **Línea 601:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 602:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 612:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 10px;`
- 🔵 **Línea 613:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 10px;`
- 🟠 **Línea 643:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 704:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 774:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 28px;`
- 🟠 **Línea 849:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 1000:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 app/shared/components/skeleton-loader/skeleton-loader.component.ts
- 🔵 **Línea 106:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 200px;`
- 🔵 **Línea 116:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 12px;`
- 🔵 **Línea 124:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 16px;`
- 🔵 **Línea 139:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 182:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 app/shared/components/smart-onboarding/smart-onboarding.component.css
- 🔵 **Línea 37:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🟠 **Línea 101:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 161:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 177:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 295:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 app/shared/components/stats-strip/stats-strip.component.css
- 🔵 **Línea 7:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px;`

### 📄 app/shared/components/stepper-modal/stepper-modal.component.html
- 🟠 **Línea 138:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 149:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 160:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 198:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 211:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`
- 🟠 **Línea 224:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4 text-cta-default"`

### 📄 app/shared/components/tooltip/tooltip.component.ts
- 🟠 **Línea 65:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`

### 📄 app/shared/components/transaction-history/transaction-history.component.css
- 🔵 **Línea 30:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `max-height: 500px;`
- 🔵 **Línea 49:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`

### 📄 app/shared/components/urgent-rental-banner/urgent-rental-banner.component.ts
- 🟠 **Línea 54:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 67:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 80:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">`
- 🟠 **Línea 105:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">`

### 📄 app/shared/components/utility-bar/utility-bar.component.html
- 🟠 **Línea 19:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"...`

### 📄 app/shared/components/verification-progress/verification-progress.component.ts
- 🟠 **Línea 82:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 131:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`
- 🟠 **Línea 203:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="w-4 h-4"`

### 📄 app/shared/components/verification-prompt-banner/verification-prompt-banner.component.ts
- 🟠 **Línea 139:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `class="h-4 w-4"`

### 📄 app/shared/components/waitlist-count/waitlist-count.component.ts
- 🟠 **Línea 11:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="h-4 w-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/wallet-account-number-card/wallet-account-number-card.component.html
- 🟠 **Línea 48:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 59:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/wallet-balance-card/wallet-balance-card.component.html
- 🟠 **Línea 313:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`
- 🟠 **Línea 337:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/waze-live-map/waze-live-map.component.ts
- 🔵 **Línea 157:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 400px;`

### 📄 app/shared/components/withdrawal-request-form/withdrawal-request-form.component.html
- 🟠 **Línea 8:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `<div class="grid gap-3 md:grid-cols-2">`
- 🟠 **Línea 227:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">`

### 📄 app/shared/components/wizard/wizard.component.ts
- 🟠 **Línea 149:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `<svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">`
- 🔵 **Línea 270:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 2px;`
- 🔵 **Línea 288:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px;`

### 📄 app/shared/directives/pull-to-refresh.directive.ts
- 🔵 **Línea 226:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`

### 📄 app/shared/directives/swipe-back.directive.ts
- 🔵 **Línea 156:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`

### 📄 index.html
- 🔵 **Línea 87:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (o...`
- 🔵 **Línea 92:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (ori...`

### 📄 styles/animations.css
- 🟠 **Línea 540:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: 0.01ms !important;`
- 🟠 **Línea 542:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition-duration: 0.01ms !important;`
- 🟠 **Línea 551:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: var(--duration-fast) !important;`

### 📄 styles/container-queries.css
- 🟠 **Línea 58:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 0.75rem !important;`
- 🟠 **Línea 63:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1rem !important;`
- 🟠 **Línea 64:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 77:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `aspect-ratio: 16/9 !important;`
- 🟠 **Línea 105:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `aspect-ratio: 4/3 !important;`
- 🟠 **Línea 364:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: block !important;`
- 🟠 **Línea 368:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`

### 📄 styles/fluid-design.css
- 🟠 **Línea 63:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.1;`
- 🟠 **Línea 68:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.15;`
- 🟠 **Línea 73:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 78:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 82:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 87:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 91:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 styles/map-marketplace-theme.css
- 🟠 **Línea 55:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 320px !important;`
- 🟠 **Línea 60:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 137:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 138:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🔵 **Línea 154:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 199:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: calc(100vw - 40px) !important;`

### 📄 styles/map-theme.css
- 🔵 **Línea 80:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🔵 **Línea 120:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 50px;`
- 🟠 **Línea 137:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🔵 **Línea 162:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 55px;`
- 🔵 **Línea 245:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🔵 **Línea 301:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 384:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 12px !important;`
- 🟠 **Línea 385:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: rgba(40, 40, 40, 0.95) !important;`
- 🟠 **Línea 390:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `0 0 1px var(--border-light-alpha-10, rgba(255, 255, 255, 0.1)) !important;`
- 🟠 **Línea 395:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: white !important;`
- 🟠 **Línea 397:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 8px 12px !important;`
- 🟠 **Línea 401:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-secondary, #9ca3b8) !important;`
- 🟠 **Línea 405:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `fill: var(--text-secondary, #9ca3b8) !important;`
- 🟠 **Línea 409:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background: transparent !important;`
- 🟠 **Línea 413:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: rgba(30, 30, 30, 0.95) !important;`
- 🟠 **Línea 422:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: #f0f0f0 !important;`
- 🟠 **Línea 427:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: rgba(79, 70, 229, 0.2) !important;`
- 🟠 **Línea 431:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: rgba(79, 70, 229, 0.3) !important;`
- 🟠 **Línea 432:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--surface-primary, var(--surface-primary, #ffffff) fff) !important;`
- 🟠 **Línea 449:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: rgba(20, 20, 20, 0.7) !important;`
- 🟠 **Línea 468:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🔵 **Línea 530:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🔵 **Línea 535:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`
- 🔵 **Línea 585:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 617:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `) !important; /* Replaced gradient with solid color token */`
- 🟠 **Línea 618:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-primary, #1f2937) !important;`
- 🟠 **Línea 619:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border: 1px solid var(--warning-alpha-30, rgba(245, 158, 11, 0.3)) !important;`
- 🟠 **Línea 621:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `flex-direction: column !important;`
- 🟠 **Línea 623:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 6px 12px !important;`
- 🟠 **Línea 644:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 645:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 665:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border: 2px solid var(--warning-default, #f59e0b) !important;`
- 🔵 **Línea 678:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 698:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `0 12px 40px var(--shadow-dark-alpha-30, rgba(0, 0, 0, 0.3)) !important;`

### 📄 styles/mobile-optimizations.css
- 🟠 **Línea 68:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: 1fr !important;`
- 🟠 **Línea 76:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 12px !important;`
- 🟠 **Línea 115:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 100% !important;`
- 🟠 **Línea 121:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 100% !important;`
- 🔵 **Línea 140:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 56px;`
- 🟠 **Línea 148:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 36px !important;`
- 🔵 **Línea 148:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px !important;`
- 🔵 **Línea 160:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 165:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 166:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 177:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-bottom: calc(80px + var(--safe-area-bottom)) !important;`
- 🟠 **Línea 184:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin-top: 0 !important;`
- 🟠 **Línea 205:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-bottom: 0 !important;`
- 🟠 **Línea 224:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-bottom: calc(80px + var(--safe-area-bottom)) !important;`
- 🟠 **Línea 229:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: 1fr !important;`
- 🟠 **Línea 241:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-top: 24px !important;`
- 🟠 **Línea 293:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `bottom: 85px !important;`
- 🟠 **Línea 295:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 45 !important;`
- 🟠 **Línea 300:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 10px 16px !important;`
- 🟠 **Línea 305:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 18px !important;`
- 🔵 **Línea 306:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 18px !important;`
- 🟠 **Línea 332:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 16px !important;`
- 🔵 **Línea 346:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🔵 **Línea 364:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🔵 **Línea 380:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🟠 **Línea 400:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.75rem !important;`
- 🟠 **Línea 401:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2 !important;`
- 🟠 **Línea 406:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.5rem !important;`
- 🟠 **Línea 407:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3 !important;`
- 🟠 **Línea 412:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.25rem !important;`
- 🟠 **Línea 413:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4 !important;`
- 🟠 **Línea 418:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1.125rem !important;`
- 🟠 **Línea 423:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 1rem !important;`
- 🟠 **Línea 429:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 434:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 13px !important;`
- 🟠 **Línea 438:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 12px !important;`
- 🟠 **Línea 450:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 12px !important;`
- 🟠 **Línea 456:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `gap: 16px !important;`
- 🟠 **Línea 484:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `width: 100vw !important;`
- 🟠 **Línea 486:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `max-width: 100vw !important;`
- 🟠 **Línea 488:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `border-radius: 0 !important;`
- 🟠 **Línea 510:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 12px 16px !important;`
- 🟠 **Línea 516:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-size: 14px !important;`
- 🟠 **Línea 518:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `margin-bottom: 6px !important;`
- 🟠 **Línea 534:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: 0.01ms !important;`
- 🟠 **Línea 536:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition-duration: 0.01ms !important;`
- 🔵 **Línea 571:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 48px;`
- 🟠 **Línea 579:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 32px !important;`
- 🔵 **Línea 579:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 32px !important;`
- 🟠 **Línea 586:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-top: max(4px, var(--safe-area-top)) !important;`
- 🟠 **Línea 599:** ⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.
  `.grid.grid-cols-1 {`
- 🟠 **Línea 600:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(2, 1fr) !important;`
- 🟠 **Línea 607:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-top: 1rem !important;`
- 🟠 **Línea 615:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 0.5rem !important;`
- 🟠 **Línea 622:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding: 0.5rem 1rem !important;`
- 🟠 **Línea 629:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-height: 300px !important;`
- 🔵 **Línea 629:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px !important;`
- 🟠 **Línea 631:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `padding-bottom: 1.5rem !important;`
- 🟠 **Línea 637:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `aspect-ratio: 16/9 !important;`
- 🟠 **Línea 660:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 40vh !important;`
- 🔵 **Línea 661:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 300px !important;`
- 🔵 **Línea 687:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 40px;`
- 🟠 **Línea 768:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-height: auto !important;`
- 🟠 **Línea 772:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `grid-template-columns: repeat(3, 1fr) !important;`
- 🟠 **Línea 779:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: calc(100vh - 120px) !important;`
- 🟠 **Línea 798:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: 70vh !important;`
- 🔵 **Línea 815:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 36px;`

### 📄 styles/primeng-theme.css
- 🟠 **Línea 10:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `z-index: 50 !important;`
- 🟠 **Línea 145:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 150:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 styles/responsive-utilities.css
- 🔵 **Línea 244:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🟠 **Línea 250:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🟠 **Línea 558:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🟠 **Línea 572:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`

### 📄 styles/shepherd-custom.scss
- 🟠 **Línea 77:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 86:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 93:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🔵 **Línea 176:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 24px;`
- 🔵 **Línea 231:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 6px;`
- 🟠 **Línea 267:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `box-shadow: 0 0 0 3px rgba(44, 74, 82, 0.2) !important;`
- 🟠 **Línea 371:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation: none !important;`

### 📄 styles.css
- 🟠 **Línea 51:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `overflow-y: auto !important;`
- 🟠 **Línea 53:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `height: auto !important;`
- 🟠 **Línea 55:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `position: relative !important;`
- 🟠 **Línea 63:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `min-height: 100svh !important;`
- 🟠 **Línea 73:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transform: none !important;`
- 🟠 **Línea 75:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `isolation: auto !important;`
- 🟠 **Línea 82:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `overflow-y: auto !important;`
- 🔵 **Línea 105:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🔵 **Línea 135:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 1px;`
- 🟠 **Línea 188:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `opacity: 0.5 !important;`
- 🟠 **Línea 190:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `pointer-events: none !important;`
- 🟠 **Línea 198:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `opacity: 0.6 !important;`
- 🟠 **Línea 200:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `background-color: var(--surface-secondary) !important;`
- 🔵 **Línea 433:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `--header-height: 80px;`
- 🔵 **Línea 435:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `--footer-height: 280px;`
- 🔵 **Línea 461:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `--header-height: 72px;`
- 🟠 **Línea 472:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `animation-duration: 0.01ms !important;`
- 🟠 **Línea 474:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `transition-duration: 0.01ms !important;`
- 🟠 **Línea 517:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 534:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `font-family: inherit !important;`
- 🟠 **Línea 551:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.2;`
- 🟠 **Línea 560:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.25;`
- 🟠 **Línea 569:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.3;`
- 🟠 **Línea 578:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 587:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🟠 **Línea 595:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 964:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.1;`
- 🟠 **Línea 969:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 974:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.6;`
- 🟠 **Línea 979:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.5;`
- 🟠 **Línea 984:** ⚠️ Interlineado muy apretado. Falta "aire" entre líneas.
  `line-height: 1.4;`
- 🔵 **Línea 1083:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🟠 **Línea 1148:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `color: var(--text-secondary) !important;`
- 🔵 **Línea 1269:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `min-height: 44px;`
- 🔵 **Línea 1343:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 48px;`
- 🟠 **Línea 1352:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `width: 20px;`
- 🔵 **Línea 1353:** ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.
  `height: 20px;`
- 🟠 **Línea 1394:** ⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.
  `@apply w-4 h-4;`
- 🟠 **Línea 1533:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`
- 🟠 **Línea 1544:** ⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.
  `display: none !important;`

