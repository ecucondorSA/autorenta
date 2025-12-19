# Orphan Components Review (2025-12-19)

Fuente: `orphan-lint-report.json` (generado por `scripts/lint-orphans.ts --strict`).

Regla de la repo: `CLAUDE.md` → **NO WIZARDS**, **NO MODALS**, **NO COMPONENTES HUÉRFANOS**.

---

## Estado actual (post-limpieza)

| Métrica | Inicial | Final | Cambio |
|---------|---------|-------|--------|
| Componentes huérfanos | 67 | 35 | **-32** |

### Acciones realizadas:
- **29 componentes eliminados** (wizards, modals, bottom-sheets, duplicados, incompletos)
- **3 componentes integrados** (OfflineBanner, ErrorState, RiskPolicyTable)

### Componentes integrados:
| Componente | Ubicación |
|------------|-----------|
| `OfflineBannerComponent` | `app.component.html` - banner global "Sin conexión" |
| `ErrorStateComponent` | `booking-detail.page.html` - estado de error con retry |
| `RiskPolicyTableComponent` | `booking-detail-payment.page.html` - detalles protección/franquicias |

---

## Resumen ejecutivo (lo importante para decidir rápido)

1) **4 “huérfanos” son falsos positivos del linter** (están cargados por Router con `loadComponent`):
- `MercadoPagoConnectComponent` (`/profile/mercadopago-connect`)
- `OrganizationDashboardComponent` (`/admin/organizations`)
- `CoverageFundDashboardComponent` (`/admin/coverage-fund`)
- `TransferFundsComponent` (`/wallet/transfer`)

2) **Mejores candidatos para “rescatar” (sí aportan y superan lo actual)**:
- `RiskPolicyTableComponent` → mejora UX/legal de garantías (se alimenta de `riskSnapshot`/`fxSnapshot`, no hardcodea).
- `ErrorStateComponent` → estandariza UI de errores, reduce duplicación y mejora consistencia.
- `OfflineBannerComponent` → mejora UX al dejar claro “sin conexión” (hoy no hay indicador global).

3) **Riesgos claros en el set de huérfanos**:
- Varios componentes usan **modales/backdrop** (rompe regla “NO MODALS”).
- Varios tienen **CSS anidado tipo SCSS (`&:hover`, `&.open`) en `styles: []`** → eso es CSS inválido en runtime.
- Hay **selector duplicado**: `app-bottom-sheet` está definido en **2 componentes distintos** (esto es una bomba si algún día se importan ambos).

## Decisiones “swap” (huérfano vs lo que usás hoy)

### PWA install
- `PwaInstallPromptComponent` (huérfano) vs `PwaInstallBannerComponent` (en uso en `apps/web/src/app/app.component.html`)
  - Recomendación: **quedarse con el banner actual**.
  - Por qué: el prompt es más intrusivo (auto‑popup a los 30s) y usa `PwaService` (flujo/servicio distinto al banner).

### Booking Request (garantía)
- `RiskPolicyTableComponent` (huérfano) vs texto suelto (actual en `BookingRequestPage`)
  - Recomendación: **migrar a `RiskPolicyTableComponent`**.
  - Por qué: explica garantías/franquicias con números reales (snapshots), reduce “confusión” y disputas.

- `TermsAndConsentsComponent` (huérfano) vs checkbox simple (actual en `BookingRequestPage`)
  - Recomendación: **NO reemplazar** (mantener checkbox simple).
  - Por qué: `TermsAndConsentsComponent` mete “card on file”/consents extra que no querés en fase de solicitud P2P.

- `CreditSecurityPanelComponent` + `DepositWarningComponent` (huérfanos) vs “wallet lock” (actual)
  - Recomendación: **NO reemplazar**.
  - Por qué: esos componentes asumen “crédito no reembolsable” (copy y lógica); hoy tu wallet tiene locks/release y balances retirables → sería inconsistente.

### Car search / fechas
- `ProfessionalDateInputComponent` / `DateSearchComponent` (huérfanos) vs `DateRangePickerComponent` (actual)
  - Recomendación: **quedarse con `DateRangePickerComponent`**.
  - Por qué: los huérfanos tienen el calendario “removido” (incompletos) y solo emiten eventos.

### Contract signing
- `ContractSignModalComponent` (huérfano) vs flujo correcto (contrato en check‑in)
  - Recomendación: **NO usar el modal**.
  - Por qué: contrato en checkout es el problema legal/UX que estamos corrigiendo; además viola “NO MODALS”.

## Inventario completo (los 67) con recomendación

Leyenda:
- **KEEP (route)** = no es huérfano real (Router).
- **INTEGRATE** = vale la pena integrar (mejora lo actual).
- **DELETE** = eliminar (obsoleto/incompleto/rompe reglas).
- **REWORK** = la idea sirve, pero el componente actual no (ej: modal → page, hardcodes → snapshot).
- **HOLD** = decisión de producto (no hay equivalente hoy).

### A) KEEP (route) — falsos positivos del linter
- `MercadoPagoConnectComponent` (`app-mercadopago-connect`) — **KEEP (route)** — está en `/profile/mercadopago-connect`.
- `OrganizationDashboardComponent` (`app-organization-dashboard`) — **KEEP (route)** — está en `/admin/organizations`.
- `CoverageFundDashboardComponent` (`app-coverage-fund-dashboard`) — **KEEP (route)** — está en `/admin/coverage-fund`.
- `TransferFundsComponent` (`app-transfer-funds`) — **KEEP (route)** — está en `/wallet/transfer`.

### B) INTEGRATED ✅ — ya integrados en el codebase
- `RiskPolicyTableComponent` (`app-risk-policy-table`) — **INTEGRATED** — en `booking-detail-payment.page.html`.
- `ErrorStateComponent` (`app-error-state`) — **INTEGRATED** — en `booking-detail.page.html`.
- `OfflineBannerComponent` (`app-offline-banner`) — **INTEGRATED** — en `app.component.html`.

### C) DELETED ✅ — eliminados del codebase
- `WizardComponent` (`app-wizard`) — **DELETED** — viola "NO WIZARDS".
- `WizardStepComponent` (`app-wizard-step`) — **DELETED** — viola "NO WIZARDS".
- `StepperModalComponent` (`app-stepper-modal`) — **DELETED** — wizard/modal (rompe regla).
- `VerificationBlockingModalComponent` (`app-verification-blocking-modal`) — **DELETED** — modal + CSS anidado.
- `InitialGoalModalComponent` (`app-initial-goal-modal`) — **DELETED** — modal (rompe regla).
- `ContractSignModalComponent` (`app-contract-sign-modal`) — **DELETED** — modal + contrato en etapa incorrecta.
- `BottomSheetComponent` (`app-bottom-sheet`) x2 — **DELETED** — modal/backdrop + selector duplicado.
- `BottomSheetFiltersComponent` (`app-bottom-sheet-filters`) — **DELETED** — depende de bottom-sheet modal.
- `ProfessionalDateInputComponent` (`app-professional-date-input`) — **DELETED** — calendario incompleto.
- `DateSearchComponent` (`app-date-search`) — **DELETED** — calendario incompleto.
- `SimpleCheckoutComponent` (`app-simple-checkout`) — **DELETED** — checkout legacy.
- `MapControlsComponent` (`app-map-controls`) — **DELETED** — CSS anidado + duplicado.
- `MapCardTooltipComponent` (`app-map-card-tooltip`) — **DELETED** — CSS inválido.
- `LocationPickerComponent` (`app-location-picker`) — **DELETED** — removido.
- `PickupLocationSelectorComponent` (`app-pickup-location-selector`) — **DELETED** — no conectado.
- `PersonalizedLocationComponent` (`app-personalized-location`) — **DELETED** — usa modal/backdrop.
- `DarkModeToggleComponent` (`app-dark-mode-toggle`) — **DELETED** — CSS anidado.
- `UrgencyBannerComponent` (`app-urgency-banner`) — **DELETED** — CSS anidado + duplicado.
- `ProtectionCreditCardComponent` (`app-protection-credit-card`) — **DELETED** — usa ModalController.
- `DriverProfileCardComponent` (`app-driver-profile-card`) — **DELETED** — usa modales.
- `DriverProfileAdvancedComponent` (`app-driver-profile-advanced`) — **DELETED** — usa modales.
- `DynamicPriceBreakdownModalComponent` (`app-dynamic-price-breakdown-modal`) — **DELETED** — modal.
- `AppHeaderComponent` (`app-app-header`) — **DELETED** — duplicado.
- `InsuranceSummaryCardComponent` (`app-insurance-summary-card`) — **DELETED** — duplicado.
- `ToastComponent` (`app-toast`) — **DELETED** — ya existe NotificationManagerService.
- `FABComponent` (`app-fab`) — **DELETED** — duplicado.
- `FacebookSidebarComponent` (`app-facebook-sidebar`) — **DELETED** — no usado.
- `PwaCapabilitiesComponent` (`app-pwa-capabilities`) — **DELETED** — legacy.
- `PwaInstallPromptComponent` (`app-pwa-install-prompt`) — **DELETED** — se usa banner actual.
- `ProtectionCreditExplanationModalComponent` — **DELETED** — modal.

### D) HOLD/REWORK — pendientes de decisión de producto (35 restantes)

Los siguientes componentes siguen huérfanos pero no violan reglas. Requieren decisión de producto:

**HOLD (features no activas):**
- `UtilityBarComponent` — sticky search alternativo
- `CarsDrawerComponent` — patrón UI alternativo
- `UserBadgesComponent` — badges determinísticos
- `ReviewSummaryComponent` — dashboard analytics
- `PendingReviewsListComponent` — pendientes en dashboard
- `MakeCalendarPublicButtonComponent` — calendario público
- `HostSupportInfoPanelComponent` — onboarding owners
- `FloatingActionFabComponent` — FAB alternativo
- `DynamicPriceDisplayComponent` — pricing dinámico/hora
- `DistanceSummaryComponent` — UX delivery/distancia
- `CalendarEventsListComponent` — calendar UI
- `PayoutStatsComponent` — stats en payouts
- `PersonalizedDashboardComponent` — dashboard alternativo
- `SkeletonComponent` — sistema de skeletons
- `ChipComponent` — UI atoms
- `FAQSectionComponent` — FAQ en marketplace
- `ChatShellComponent` — lib de chat
- `GoogleAiPhotoGeneratorComponent` — AI en publish
- `InsuranceSelectorComponent` — selección de seguros
- `DynamicPriceLockPanelComponent` — price lock UI
- `CoverageUpgradeSelectorComponent` — upgrades de cobertura
- `FgoManagementComponent` — admin ops
- `WaterfallSimulatorComponent` — herramienta admin
- `DistanceBadgeComponent` — badge de distancia
- `OfflineMessagesPanelComponent` — mensajes offline (convertir a ruta)
- `ClaimFormComponent` — formulario de claims (convertir a ruta)

**REWORK (necesitan refactor):**
- `PaymentMethodComparisonComponent` — hardcodea montos
- `DistanceRiskTierBadgeComponent` — mezcla emojis
- `DepositWarningComponent` — copy desalineado
- `TermsAndConsentsComponent` — mover a pago final
- `CreditSecurityPanelComponent` — modelo desalineado
