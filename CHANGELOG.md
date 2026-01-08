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
