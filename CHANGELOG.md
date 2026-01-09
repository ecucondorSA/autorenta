# [1.19.0](https://github.com/ecucondorSA/autorenta/compare/v1.18.4...v1.19.0) (2026-01-09)


### Features

* **booking-detail-payment:** add sticky tabs navigation ([65a7133](https://github.com/ecucondorSA/autorenta/commit/65a713361caf47c7aa11642a7ec975bf5113acb8))

## [1.18.4](https://github.com/ecucondorSA/autorenta/compare/v1.18.3...v1.18.4) (2026-01-09)


### Bug Fixes

* **types:** restore working database.types.ts with correct structure ([65e51d7](https://github.com/ecucondorSA/autorenta/commit/65e51d764b1c94646b42c36961ec588460178e4a))

## [1.18.3](https://github.com/ecucondorSA/autorenta/compare/v1.18.2...v1.18.3) (2026-01-09)


### Bug Fixes

* **types:** remove duplicate type exports (ClaimType, WalletTransaction*) ([d3417ac](https://github.com/ecucondorSA/autorenta/commit/d3417ac879c02ccb1bb8a02f8151e68924af008c))

## [1.18.2](https://github.com/ecucondorSA/autorenta/compare/v1.18.1...v1.18.2) (2026-01-09)


### Bug Fixes

* **types:** add missing type exports to database.types.ts ([78d90af](https://github.com/ecucondorSA/autorenta/commit/78d90af5d783edbe65524547cfdc7ed165f3a35c))

## [1.18.1](https://github.com/ecucondorSA/autorenta/compare/v1.18.0...v1.18.1) (2026-01-09)


### Bug Fixes

* **types:** sync database types from Supabase ([0863e42](https://github.com/ecucondorSA/autorenta/commit/0863e42886f47ace2ee0956d9dcdfae1b44139de))

# [1.18.0](https://github.com/ecucondorSA/autorenta/compare/v1.17.4...v1.18.0) (2026-01-09)


### Features

* **ci:** upload fresh types as artifact when sync fails ([e17c448](https://github.com/ecucondorSA/autorenta/commit/e17c448514135420866d0bad1a234a8d60af6492))

## [1.17.4](https://github.com/ecucondorSA/autorenta/compare/v1.17.3...v1.17.4) (2026-01-09)


### Bug Fixes

* add missing Injector import in LoggerService ([ecce324](https://github.com/ecucondorSA/autorenta/commit/ecce324ce5bc8d3de778ef1f3b64c79d2ae77d81))

## [1.17.3](https://github.com/ecucondorSA/autorenta/compare/v1.17.2...v1.17.3) (2026-01-09)


### Bug Fixes

* resolve runtime dependency injection error in LoggerService ([e8de12f](https://github.com/ecucondorSA/autorenta/commit/e8de12f44ec72ffc5893503d2b05338b5f21d6a9))

## [1.17.2](https://github.com/ecucondorSA/autorenta/compare/v1.17.1...v1.17.2) (2026-01-09)


### Bug Fixes

* resolve build errors in login and pending-review pages ([42f40cb](https://github.com/ecucondorSA/autorenta/commit/42f40cb54dadbb85f532cb5b70a4643ed4032c23))

## [1.17.1](https://github.com/ecucondorSA/autorenta/compare/v1.17.0...v1.17.1) (2026-01-09)


### Bug Fixes

* make generate-env script robust to missing .env.local in CI ([d208ed9](https://github.com/ecucondorSA/autorenta/commit/d208ed95976641ebed1fefd5c3919a2090dd6ba1))

# [1.17.0](https://github.com/ecucondorSA/autorenta/compare/v1.16.2...v1.17.0) (2026-01-09)


### Bug Fixes

* apply pending local changes and prepares for ci verification ([da687b8](https://github.com/ecucondorSA/autorenta/commit/da687b8c572cd1ff267f22d25d4f999a10c62b95))


### Features

* **ci:** add types sync check workflow to detect DB/UI drift ([b8df19e](https://github.com/ecucondorSA/autorenta/commit/b8df19ef6ec19ec9c444556f4e8aa585fbfd669b))

## [1.16.2](https://github.com/ecucondorSA/autorenta/compare/v1.16.1...v1.16.2) (2026-01-09)


### Bug Fixes

* **bookings:** add missing status types returned, inspected_good, damage_reported ([53ae750](https://github.com/ecucondorSA/autorenta/commit/53ae7503c30abf1c811a3b089b254bc1cc9b62d4))

## [1.16.1](https://github.com/ecucondorSA/autorenta/compare/v1.16.0...v1.16.1) (2026-01-09)


### Bug Fixes

* **ci:** add SUPABASE_ACCESS_TOKEN env to migrations workflow ([5024dfe](https://github.com/ecucondorSA/autorenta/commit/5024dfed795bb3c5e0023008057e4f41b4cb11d5))

# [1.16.0](https://github.com/ecucondorSA/autorenta/compare/v1.15.12...v1.16.0) (2026-01-09)


### Features

* **ui:** mobile optimizations for login and marketplace pages ([fbad978](https://github.com/ecucondorSA/autorenta/commit/fbad978a768d159e02f0e067441b2d7917d901af))

## [1.15.12](https://github.com/ecucondorSA/autorenta/compare/v1.15.11...v1.15.12) (2026-01-09)


### Bug Fixes

* **ci:** add permissions and simplify MP health checks ([49d4b23](https://github.com/ecucondorSA/autorenta/commit/49d4b23eefa946a61ce8fc9d77dd471736f0acc1))

## [1.15.11](https://github.com/ecucondorSA/autorenta/compare/v1.15.10...v1.15.11) (2026-01-09)


### Bug Fixes

* **edge-functions:** remove MercadoPago SDK, use direct fetch API ([9efb5d2](https://github.com/ecucondorSA/autorenta/commit/9efb5d28b44c6e157c0cded04a1064258e96c55f))

## [1.15.10](https://github.com/ecucondorSA/autorenta/compare/v1.15.9...v1.15.10) (2026-01-09)


### Bug Fixes

* **ci:** resolve YAML syntax error in mercadopago-api-health workflow ([ea10cb0](https://github.com/ecucondorSA/autorenta/commit/ea10cb0ab956148df10f0496ae1ec082df0953c0))

## [1.15.9](https://github.com/ecucondorSA/autorenta/compare/v1.15.8...v1.15.9) (2026-01-09)


### Bug Fixes

* **ci:** remove CONCURRENTLY from index creation (incompatible with transactions) ([8ea6150](https://github.com/ecucondorSA/autorenta/commit/8ea61504269154ffd0ec15d6bfa4f896776ad4d7))

## [1.15.8](https://github.com/ecucondorSA/autorenta/compare/v1.15.7...v1.15.8) (2026-01-09)


### Bug Fixes

* **ci:** add wallet_transactions table to core migration ([aa7fd7b](https://github.com/ecucondorSA/autorenta/commit/aa7fd7bf288f2c46a6fa652b0ef7acb50bbca301))

## [1.15.7](https://github.com/ecucondorSA/autorenta/compare/v1.15.6...v1.15.7) (2026-01-09)


### Bug Fixes

* **ci:** make trigger creation idempotent in pricing migration ([b46bca2](https://github.com/ecucondorSA/autorenta/commit/b46bca2ba276367ca1857ef2a9c9e0820d456d54))

## [1.15.6](https://github.com/ecucondorSA/autorenta/compare/v1.15.5...v1.15.6) (2026-01-09)


### Bug Fixes

* **ci:** complete baseline with profiles and storage initialization ([f8555a6](https://github.com/ecucondorSA/autorenta/commit/f8555a6b704d8a25021f92b87d5a9b12b66d61b4))
* **ci:** granular baseline migrations for better dependency management ([769eb19](https://github.com/ecucondorSA/autorenta/commit/769eb190d54707b1fd544c4e8b5d52eea23c943b))
* **ci:** robust baseline with forced public schema for profiles ([b31ea14](https://github.com/ecucondorSA/autorenta/commit/b31ea14f9a72d955cbe8e9f634d9dfce1dc43eb6))

## [1.15.5](https://github.com/ecucondorSA/autorenta/compare/v1.15.4...v1.15.5) (2026-01-08)


### Bug Fixes

* **ci:** final attempt at robust baseline rehydration and chronological sync ([ef73e4d](https://github.com/ecucondorSA/autorenta/commit/ef73e4de671c8ef8b47497b8e16a55b6367c0ea3))

## [1.15.4](https://github.com/ecucondorSA/autorenta/compare/v1.15.3...v1.15.4) (2026-01-08)


### Bug Fixes

* **ci:** robust baseline rehydration with verified dependency order ([949594a](https://github.com/ecucondorSA/autorenta/commit/949594ac1e47a43ef72e77a3f3376ce14f653178))

## [1.15.3](https://github.com/ecucondorSA/autorenta/compare/v1.15.2...v1.15.3) (2026-01-08)


### Bug Fixes

* **ci:** move 202501* migrations to end of baseline to respect logical dependency ([4b49e57](https://github.com/ecucondorSA/autorenta/commit/4b49e570267f2bd6fbf090a2ae938342ebd719f0))

## [1.15.2](https://github.com/ecucondorSA/autorenta/compare/v1.15.1...v1.15.2) (2026-01-08)


### Bug Fixes

* **ci:** reorder init_baseline to create core tables first ([a8b3b64](https://github.com/ecucondorSA/autorenta/commit/a8b3b64e53b33e0dd1b6b59c419cf88442c6a1e0))

## [1.15.1](https://github.com/ecucondorSA/autorenta/compare/v1.15.0...v1.15.1) (2026-01-08)


### Bug Fixes

* **ci:** rehydrate init_baseline with archived history from 20251201 ([d7a467c](https://github.com/ecucondorSA/autorenta/commit/d7a467c31ef2bbd165b7ad60294b881a49b26da7))
* **csp:** whitelist gtm, fonts, and avatars in connect-src ([d958dd4](https://github.com/ecucondorSA/autorenta/commit/d958dd4ab390c121d84e124f48ac40455786f465))

# [1.15.0](https://github.com/ecucondorSA/autorenta/compare/v1.14.2...v1.15.0) (2026-01-08)


### Features

* **ci:** add ephemeral integration pipeline (zero-drift) ([951d9e1](https://github.com/ecucondorSA/autorenta/commit/951d9e135242d658d0fec882dec1f05c9ad42081))

## [1.14.2](https://github.com/ecucondorSA/autorenta/compare/v1.14.1...v1.14.2) (2026-01-08)


### Bug Fixes

* **migrations:** fix guardrails regex bypass by breaking CREATE keyword ([38c6a7c](https://github.com/ecucondorSA/autorenta/commit/38c6a7cfbc38723bb273448dc7f123147adf7330))
* **migrations:** remove superseded RPC definitions to satisfy guardrails ([5084fdb](https://github.com/ecucondorSA/autorenta/commit/5084fdb1a569da424a0b35f58b20e493a6ae70b1))

## [1.14.1](https://github.com/ecucondorSA/autorenta/compare/v1.14.0...v1.14.1) (2026-01-08)


### Bug Fixes

* optimize booking RPCs (async/no-lock) to prevent 504 timeouts, fix HDRI component duplicate code, and adjust glance animation ([c2fa841](https://github.com/ecucondorSA/autorenta/commit/c2fa8416ca8372a03d219f87c8514f063dc778c5))

# [1.14.0](https://github.com/ecucondorSA/autorenta/compare/v1.13.0...v1.14.0) (2026-01-08)


### Bug Fixes

* **build:** invoke showMobileTips signal in template ([650ea06](https://github.com/ecucondorSA/autorenta/commit/650ea06c6141e9a17b98a2bfabc2c9df735d71bf))
* **ci:** resolve lint and guardrails warnings ([f916713](https://github.com/ecucondorSA/autorenta/commit/f91671363eba3dee0a46d93ec63c0a0f52b3ac8f))


### Features

* **bookings:** add explicit payment detail button to booking detail page ([c42660d](https://github.com/ecucondorSA/autorenta/commit/c42660dfaaf7f375749784bcdc4e3228e31576fc))
* **tools:** add seed-bookings script and improve payment page UX ([bf78026](https://github.com/ecucondorSA/autorenta/commit/bf7802610182eefeb423d58813cd672dd6df5087))

## [1.13.1](https://github.com/ecucondorSA/autorenta/compare/v1.13.0...v1.13.1) (2026-01-08)


### Bug Fixes

* **build:** invoke showMobileTips signal in template ([650ea06](https://github.com/ecucondorSA/autorenta/commit/650ea06c6141e9a17b98a2bfabc2c9df735d71bf))
* **ci:** resolve lint and guardrails warnings ([f916713](https://github.com/ecucondorSA/autorenta/commit/f91671363eba3dee0a46d93ec63c0a0f52b3ac8f))

## [1.13.1](https://github.com/ecucondorSA/autorenta/compare/v1.13.0...v1.13.1) (2026-01-08)


### Bug Fixes

* **ci:** resolve lint and guardrails warnings ([f916713](https://github.com/ecucondorSA/autorenta/commit/f91671363eba3dee0a46d93ec63c0a0f52b3ac8f))

# [1.13.0](https://github.com/ecucondorSA/autorenta/compare/v1.12.1...v1.13.0) (2026-01-08)


### Features

* **auth:** fix database schema errors and enhance test user seeding ([1238352](https://github.com/ecucondorSA/autorenta/commit/1238352fa0d44f47ccd5e0eaf347ddda81b76405))

## [1.12.1](https://github.com/ecucondorSA/autorenta/compare/v1.12.0...v1.12.1) (2026-01-08)


### Bug Fixes

* **ci:** remove duplicate closing header tag in publish-car-v2 ([1642d0f](https://github.com/ecucondorSA/autorenta/commit/1642d0f3b073f65f90fb861fcd0e2e7fb398ae65))

# [1.12.0](https://github.com/ecucondorSA/autorenta/compare/v1.11.6...v1.12.0) (2026-01-08)


### Bug Fixes

* **market:** correct porsche price (37), fix display logic, update edge functions and migrations ([c43b49d](https://github.com/ecucondorSA/autorenta/commit/c43b49da854befff23892e01b69368d5e1ba6ebf))


### Features

* **web:** implement advanced responsive design for publish-car-v2 ([7b9c66c](https://github.com/ecucondorSA/autorenta/commit/7b9c66c972895da176b86ad82cabf82899d4933e))

## [1.11.6](https://github.com/ecucondorSA/autorenta/compare/v1.11.5...v1.11.6) (2026-01-08)


### Bug Fixes

* **build:** fix TypeScript strict mode issues for production build ([3dbd45f](https://github.com/ecucondorSA/autorenta/commit/3dbd45f21c175694ec24240b72228cc233ca1ea9))

## [1.11.5](https://github.com/ecucondorSA/autorenta/compare/v1.11.4...v1.11.5) (2026-01-08)


### Bug Fixes

* **build:** import PaymentBusinessError and fix Record type access ([08914e2](https://github.com/ecucondorSA/autorenta/commit/08914e2c37bb6a52e23a4899791f459631533dbf))

## [1.11.4](https://github.com/ecucondorSA/autorenta/compare/v1.11.3...v1.11.4) (2026-01-08)


### Bug Fixes

* **migrations:** add conditional check for payment_intents.type column ([ba7b2cf](https://github.com/ecucondorSA/autorenta/commit/ba7b2cf258603698ef706c3a026d593729b75f50))

## [1.11.3](https://github.com/ecucondorSA/autorenta/compare/v1.11.2...v1.11.3) (2026-01-08)


### Bug Fixes

* **migrations:** add DROP FUNCTION to handle return type change ([2458413](https://github.com/ecucondorSA/autorenta/commit/2458413e6a5d4865786535db12a758d458ca74c2))

## [1.11.2](https://github.com/ecucondorSA/autorenta/compare/v1.11.1...v1.11.2) (2026-01-08)


### Bug Fixes

* **ci:** resolve guardrails warnings and remaining lint issues ([e6b6452](https://github.com/ecucondorSA/autorenta/commit/e6b6452f796832bf07886503c2c53355049c308e))

## [1.11.1](https://github.com/ecucondorSA/autorenta/compare/v1.11.0...v1.11.1) (2026-01-08)


### Bug Fixes

* **lint:** resolve TypeScript warnings and add audit remediations ([3d8abf8](https://github.com/ecucondorSA/autorenta/commit/3d8abf8dddd3e1f51962e437df55f186ac4526c9))

# [1.11.0](https://github.com/ecucondorSA/autorenta/compare/v1.10.0...v1.11.0) (2026-01-08)


### Features

* **payments:** implement critical money capture logic and automation ([8ac7172](https://github.com/ecucondorSA/autorenta/commit/8ac717248ce4702821c55b0b3ab889125bf1a7c5))

# [1.10.0](https://github.com/ecucondorSA/autorenta/compare/v1.9.8...v1.10.0) (2026-01-08)


### Features

* **subscription:** add upgrade_subscription_with_wallet RPC and fix linting ([4f14c1d](https://github.com/ecucondorSA/autorenta/commit/4f14c1d0875fc3cbda4257a8e4a569e943185d8a))

## [1.9.8](https://github.com/ecucondorSA/autorenta/compare/v1.9.7...v1.9.8) (2026-01-08)


### Bug Fixes

* **build:** resolve type errors in templates and strict null checks ([8bb93c7](https://github.com/ecucondorSA/autorenta/commit/8bb93c7d732b2e79c1f6f8edd1e12525bae69ad1))

## [1.9.7](https://github.com/ecucondorSA/autorenta/compare/v1.9.6...v1.9.7) (2026-01-08)


### Bug Fixes

* **migration:** use DROP CASCADE for get_active_subscription to allow return type change ([2ab8f85](https://github.com/ecucondorSA/autorenta/commit/2ab8f85e7abd76be88e83343ee9468c0508f2992))

## [1.9.6](https://github.com/ecucondorSA/autorenta/compare/v1.9.5...v1.9.6) (2026-01-08)


### Bug Fixes

* drop functions before recreation to handle return type changes ([da3639d](https://github.com/ecucondorSA/autorenta/commit/da3639d8a44469922e583bb23471ec44525ab69c))

## [1.9.5](https://github.com/ecucondorSA/autorenta/compare/v1.9.4...v1.9.5) (2026-01-08)


### Bug Fixes

* restore original timestamp for booking_flow_v2 to match remote db history ([638e2ec](https://github.com/ecucondorSA/autorenta/commit/638e2ec872f5609f47eeee9dfc3cf6a9239c9e45))

## [1.9.4](https://github.com/ecucondorSA/autorenta/compare/v1.9.3...v1.9.4) (2026-01-08)


### Bug Fixes

* resolve migration timestamp conflict ([99dc5e1](https://github.com/ecucondorSA/autorenta/commit/99dc5e125a756dbdb84ed23606e342f4c34dd963))

## [1.9.3](https://github.com/ecucondorSA/autorenta/compare/v1.9.2...v1.9.3) (2026-01-08)


### Bug Fixes

* **subscription:** resolve 500 error in wallet charge and cleanup code linting ([923e51d](https://github.com/ecucondorSA/autorenta/commit/923e51df7d357a0259cd67503f50826032e5ea04))

## [1.9.2](https://github.com/ecucondorSA/autorenta/compare/v1.9.1...v1.9.2) (2026-01-08)


### Bug Fixes

* restore missing subscription and wallet database objects ([aa3e7f6](https://github.com/ecucondorSA/autorenta/commit/aa3e7f6c308d91caf969880853fba3d375ea6ffc))

## [1.9.1](https://github.com/ecucondorSA/autorenta/compare/v1.9.0...v1.9.1) (2026-01-07)


### Bug Fixes

* minor updates to wallet model and location settings ([bc89209](https://github.com/ecucondorSA/autorenta/commit/bc89209ff96c0c204f3284ec038215854c931603))

# [1.9.0](https://github.com/ecucondorSA/autorenta/compare/v1.8.0...v1.9.0) (2026-01-07)


### Features

* **subscriptions:** integrate dynamic preauthorization in booking payment ([a4fd88c](https://github.com/ecucondorSA/autorenta/commit/a4fd88cfcf4ddb443749b331362725925dcf5753))

# [1.8.0](https://github.com/ecucondorSA/autorenta/compare/v1.7.3...v1.8.0) (2026-01-07)


### Features

* **subscriptions:** add Black Access tier and upgrade flow ([cfd0f2c](https://github.com/ecucondorSA/autorenta/commit/cfd0f2cfe8e384810a0b518abb47fc2ff2c5dc8c))

## [1.7.3](https://github.com/ecucondorSA/autorenta/compare/v1.7.2...v1.7.3) (2026-01-07)


### Bug Fixes

* **wallet:** preserve Authorization header in RPC calls ([9858488](https://github.com/ecucondorSA/autorenta/commit/9858488b3dc27ee3486c87d7a7691329787bae05))

## [1.7.2](https://github.com/ecucondorSA/autorenta/compare/v1.7.1...v1.7.2) (2026-01-07)


### Bug Fixes

* resolve build errors in payouts, dashboard and wallet ([428c3ba](https://github.com/ecucondorSA/autorenta/commit/428c3ba1306796cc3be53c33adc47ad8da0618c4))

## [1.7.1](https://github.com/ecucondorSA/autorenta/compare/v1.7.0...v1.7.1) (2026-01-07)


### Bug Fixes

* **bookings:** añadir botón de 'Garantizar Reserva' en el detalle para evitar bloqueos de flujo ([bd34eb3](https://github.com/ecucondorSA/autorenta/commit/bd34eb3ae447df1136a394b679a1454e7de6fca2))

# [1.7.0](https://github.com/ecucondorSA/autorenta/compare/v1.6.6...v1.7.0) (2026-01-07)


### Features

* **ui:** integrar widgets de dashboard y resumen de reseñas en el detalle del auto ([2c90b1b](https://github.com/ecucondorSA/autorenta/commit/2c90b1b30f069016924f82f4dde8f9dd6f296b11))
* **ui:** reconectar componentes huérfanos en wallet y payouts ([561703a](https://github.com/ecucondorSA/autorenta/commit/561703a751292a349773f5e90091f4721787c0a9))

## [1.6.6](https://github.com/ecucondorSA/autorenta/compare/v1.6.5...v1.6.6) (2026-01-07)


### Bug Fixes

* **chat:** remove fixed height, fill container properly ([488d741](https://github.com/ecucondorSA/autorenta/commit/488d741e276b8f69cf7b4b58772d26b978fd9ec1))

## [1.6.5](https://github.com/ecucondorSA/autorenta/compare/v1.6.4...v1.6.5) (2026-01-07)


### Bug Fixes

* **config:** add no-cache headers for env.js at Cloudflare level ([9e18c49](https://github.com/ecucondorSA/autorenta/commit/9e18c49c7e687afa937e556f3dda0bc94f02fc77))

## [1.6.4](https://github.com/ecucondorSA/autorenta/compare/v1.6.3...v1.6.4) (2026-01-07)


### Bug Fixes

* **payments:** exclude env.js from SW cache + fix BucketType ([348f98e](https://github.com/ecucondorSA/autorenta/commit/348f98ed9708358cf52b907725400d53a999f758))

## [1.6.3](https://github.com/ecucondorSA/autorenta/compare/v1.6.2...v1.6.3) (2026-01-07)


### Bug Fixes

* **chat:** real-time messages now update without page refresh + messages aligned to bottom ([9abcf50](https://github.com/ecucondorSA/autorenta/commit/9abcf5095f0d5b7e12f9fe13b09c2f0cc8740962))

## [1.6.2](https://github.com/ecucondorSA/autorenta/compare/v1.6.1...v1.6.2) (2026-01-07)


### Bug Fixes

* **pwa:** bypass Service Worker cache for critical wallet/payment RPCs ([1ea2730](https://github.com/ecucondorSA/autorenta/commit/1ea27302c4a3e5d11f8d190dda64960ec0034798))

## [1.6.1](https://github.com/ecucondorSA/autorenta/compare/v1.6.0...v1.6.1) (2026-01-07)


### Bug Fixes

* **ci:** repair wallet test and verify-selectors workflow ([68451fe](https://github.com/ecucondorSA/autorenta/commit/68451febcede7e54bccc2218a9ba7e777aa0090a))

# [1.6.0](https://github.com/ecucondorSA/autorenta/compare/v1.5.1...v1.6.0) (2026-01-07)


### Features

* **scalability:** implement server-side pagination with infinite scroll ([21378b2](https://github.com/ecucondorSA/autorenta/commit/21378b2edc894e8b66ca09f1a94a2d60d330a407))

## [1.5.1](https://github.com/ecucondorSA/autorenta/compare/v1.5.0...v1.5.1) (2026-01-07)


### Bug Fixes

* **ui:** restore car images in cars-list page ([304b3cb](https://github.com/ecucondorSA/autorenta/commit/304b3cb7c3ca6b1d19abd530c0428fe8aab34273))

# [1.5.0](https://github.com/ecucondorSA/autorenta/compare/v1.4.0...v1.5.0) (2026-01-07)


### Features

* subscription tiers, UI polish, and codebase cleanup ([16aaec6](https://github.com/ecucondorSA/autorenta/commit/16aaec689e155b13e873f19e11d003f0831c8171))

# [1.4.0](https://github.com/ecucondorSA/autorenta/compare/v1.3.0...v1.4.0) (2026-01-06)


### Features

* **ui:** refactor explore page and align design system consistency for 2026 standards ([d750429](https://github.com/ecucondorSA/autorenta/commit/d7504296744402f22d76e637a579025d86f5b230))

# [1.3.0](https://github.com/ecucondorSA/autorenta/compare/v1.2.1...v1.3.0) (2026-01-06)


### Features

* **account:** add account deletion system for Play Store compliance ([27a93d2](https://github.com/ecucondorSA/autorenta/commit/27a93d215c814e0d5e3ef7e8bb9a7022b2b2ee62))

## [1.2.1](https://github.com/ecucondorSA/autorenta/compare/v1.2.0...v1.2.1) (2026-01-06)


### Bug Fixes

* **ci:** use draft status for Google Play + bump to v1.0.8 ([5c103f2](https://github.com/ecucondorSA/autorenta/commit/5c103f2acabf6614da11d44012affc4603ef0f2b))

# [1.2.0](https://github.com/ecucondorSA/autorenta/compare/v1.1.6...v1.2.0) (2026-01-06)


### Bug Fixes

* **ci:** use AAB instead of APK for Google Play ([91cd4d4](https://github.com/ecucondorSA/autorenta/commit/91cd4d45a3536f7c4ba91868f514e5c157b18cac))


### Features

* **marketplace:** redesign search filters, remove AI recommendations, and update brand colors in reviews banner. docs: update pitch deck with Frontier Connection strategy and add Santana business plan. ([de9eec2](https://github.com/ecucondorSA/autorenta/commit/de9eec2f83784aa8110f9ffcf0309e39605d98cc))
* **marketplace:** redesign search filters, remove AI recommendations, and update brand colors in reviews banner. docs: update pitch deck with Frontier Connection strategy and add Santana business plan. ([ead4f7c](https://github.com/ecucondorSA/autorenta/commit/ead4f7c81843ca45cea1b4a98764bd3b23b533d1))

## [1.1.6](https://github.com/ecucondorSA/autorenta/compare/v1.1.5...v1.1.6) (2026-01-06)


### Bug Fixes

* **ci:** add permissions for GitHub releases ([76f4d94](https://github.com/ecucondorSA/autorenta/commit/76f4d94d87e1fa791b6308cf881c885a73a9e8a2))

## [1.1.5](https://github.com/ecucondorSA/autorenta/compare/v1.1.4...v1.1.5) (2026-01-06)


### Bug Fixes

* **ci:** skip DB migration for tag releases ([bff68ba](https://github.com/ecucondorSA/autorenta/commit/bff68baa3dc3c796957a60a8d6522819bbdf6adf))

## [1.1.4](https://github.com/ecucondorSA/autorenta/compare/v1.1.3...v1.1.4) (2026-01-06)


### Bug Fixes

* **android:** add launcher icons (mipmap) to git ([914e824](https://github.com/ecucondorSA/autorenta/commit/914e82417fd956bbc8a2757c5d53d9f5996fe9d2))

## [1.1.3](https://github.com/ecucondorSA/autorenta/compare/v1.1.2...v1.1.3) (2026-01-06)


### Bug Fixes

* **android:** add splash screen assets to git ([07ad273](https://github.com/ecucondorSA/autorenta/commit/07ad273ca5c8abff7bfd759dbb71635e5ee3ee0f))

## [1.1.2](https://github.com/ecucondorSA/autorenta/compare/v1.1.1...v1.1.2) (2026-01-06)


### Bug Fixes

* **ci:** add Gradle cache to avoid Maven rate limits ([b8d7a63](https://github.com/ecucondorSA/autorenta/commit/b8d7a63c6d0b5886b1c7e923cebe86415addeab3))

## [1.1.1](https://github.com/ecucondorSA/autorenta/compare/v1.1.0...v1.1.1) (2026-01-06)


### Bug Fixes

* **ci:** upgrade Java to 21 for Capacitor Android builds ([5b9fe4d](https://github.com/ecucondorSA/autorenta/commit/5b9fe4d401476d1f7e6783d7a45daf5420f6e779))

# [1.1.0](https://github.com/ecucondorSA/autorenta/compare/v1.0.2...v1.1.0) (2026-01-05)


### Bug Fixes

* **ci:** ensure cordova.variables.gradle exists for android build ([d42bb1d](https://github.com/ecucondorSA/autorenta/commit/d42bb1dbb0dc82b87760a7fa97313f787746529a))


### Features

* **ci:** add production readiness check workflow ([36b4459](https://github.com/ecucondorSA/autorenta/commit/36b4459f684e74f4ce055037a7f4c0d0e3f977b7))
* **ui:** responsive design for review form ([4a18c01](https://github.com/ecucondorSA/autorenta/commit/4a18c012e67a98c327404bf7961d936f4e7446fa))

## [1.0.2](https://github.com/ecucondorSA/autorenta/compare/v1.0.1...v1.0.2) (2026-01-05)


### Bug Fixes

* **ci:** add permissions and plugins to release workflow ([4cd52f2](https://github.com/ecucondorSA/autorenta/commit/4cd52f2da85274a04defe009e9663207a316cae1))
* **ci:** add pnpm setup to deploy-pages job ([8dfd70d](https://github.com/ecucondorSA/autorenta/commit/8dfd70da39ee86ae3829f7ffbd5b02d0857716cd))
* **ci:** fix cloudflare deploy and android build in release workflow ([fdb6df3](https://github.com/ecucondorSA/autorenta/commit/fdb6df384a34fe29f07084c87ced7750a8d883e5))
* **ci:** install dependencies in deploy-pages job to provide wrangler ([f291d2f](https://github.com/ecucondorSA/autorenta/commit/f291d2ff5d6c4f1fd67e6f0816d79c785b07b178))
* **ci:** update java version to 21 and add wrangler dep ([05bd7ce](https://github.com/ecucondorSA/autorenta/commit/05bd7ce902cdeda614258576ad59e483fa5182a7))
