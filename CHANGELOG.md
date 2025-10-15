# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.4.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.3.0...v1.4.0) (2025-10-15)


### Features

* copy previous phase when creating new day entry ([88a7c0e](https://github.com/scepbjoern/fairment_Darmkur_App/commit/88a7c0e93a94e1b188fd4bc41702fa346ac5b493))

## [1.3.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.2.0...v1.3.0) (2025-09-19)


### Features

* add color-coded sparklines for symptom and stool tracking visualizations ([a92af71](https://github.com/scepbjoern/fairment_Darmkur_App/commit/a92af710adff97145714d9dcce63665cc433d7e4))
* add stool-specific color scheme to sparkline visualization ([bc1212d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/bc1212d0b206e8562adb269618838b644ea2d646))


### Bug Fixes

* treat bristol value 99 as "no stool" and exclude from analytics calculations ([ed8e7f1](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ed8e7f1d6babdcf394e7234deededbd24d37e549))

## [1.2.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.1.0...v1.2.0) (2025-09-17)


### Features

* add icon support for habits and symptoms with default icons and per-user overrides ([df783a2](https://github.com/scepbjoern/fairment_Darmkur_App/commit/df783a2ff3d0c55cb57742664fbf0cd4c5b2ab5b))
* add icons to page headers and section titles ([e3e5161](https://github.com/scepbjoern/fairment_Darmkur_App/commit/e3e51616d58fdcde921d012b6c3458df1acddc78))
* add sparklines and yesterday values to symptoms, stool and habits ([eee0243](https://github.com/scepbjoern/fairment_Darmkur_App/commit/eee0243001c3005dca7abb4cfe9e6c3c8c6bd18d))
* add sparklines, yesterday indicators, and icon customization to help page ([62c41ae](https://github.com/scepbjoern/fairment_Darmkur_App/commit/62c41ae949aadd041da4d820f4b07fca696f6140))
* add sticky save bar and toast notifications for unsaved changes ([1e169d7](https://github.com/scepbjoern/fairment_Darmkur_App/commit/1e169d7af7c1150188f5d717f2464c9bcfc99a9c))
* improve save feedback with inline confirmation and green buttons ([22367d1](https://github.com/scepbjoern/fairment_Darmkur_App/commit/22367d1ca7925cdf6dc127442c883e8fd3e9f5d6))
* **ui:** enhance symptoms and habits organization ([6adbbe7](https://github.com/scepbjoern/fairment_Darmkur_App/commit/6adbbe705155e06977b0e36661415378afda56f5))

## [1.1.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.0.1...v1.1.0) (2025-09-15)


### Features

* add DELETE endpoints and clear functionality for day entries and symptoms ([365f16d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/365f16d2ebf6593fe0d93d69fa82ee75be43a27a))
* add draft state and manual save for symptom tracking ([2bf0d66](https://github.com/scepbjoern/fairment_Darmkur_App/commit/2bf0d6605c98e69da1d61169986af0860bc08c1c))
* add optional weight tracking to reflections with decimal precision ([887c814](https://github.com/scepbjoern/fairment_Darmkur_App/commit/887c8143faa6e9b67b63751990b489901e1b1a95))

## [1.0.1](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.0.0...v1.0.1) (2025-09-12)


### Features

* add OpenAI transcription env vars to docker-compose config ([06e70a3](https://github.com/scepbjoern/fairment_Darmkur_App/commit/06e70a35c7ff59a00d5fa84425db4eafb75365f0))


### Bug Fixes

* use createRequire instead of JSON import assertions for better compatibility ([d717333](https://github.com/scepbjoern/fairment_Darmkur_App/commit/d717333f5efcf67ff35dc1f320a6bd4fc1984812))

## [1.0.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.3.0...v1.0.0) (2025-09-12)


### Features

* add edit mode and delete functionality for remarks section ([0fa6c89](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0fa6c893708b05a77b48ff7e6b7c8cf33ad923ab))
* add mobile user avatar menu with profile and logout options ([0cd21c6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0cd21c6661fb6346f6a07712f277ce913b6e429a))
* add voice transcription inputs with OpenAI API integration ([ceed4ee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ceed4ee34749f8f01044c9939e9d2d226508f710))

## [1.0.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.4.0...v1.0.0) (2025-09-12)
Main release after
refactor: use getPrisma() factory instead of direct prisma import
feat(nav): vereinheitlichte Farben Light/Dark + Hover
feat(mobile): Links-Submenü collapsible + text-sm
fix(profile-menu): Outside-Click schließt Menü nicht vor Click-Handlern
feat(day): Titel „Tagebuch D.M.YYYY“ (ohne führende Nullen)

## [0.4.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.3.0...v0.4.0) (2025-09-12)


### Features

* add edit mode and delete functionality for remarks section ([0fa6c89](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0fa6c893708b05a77b48ff7e6b7c8cf33ad923ab))
* add mobile user avatar menu with profile and logout options ([0cd21c6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0cd21c6661fb6346f6a07712f277ce913b6e429a))
* add voice transcription inputs with OpenAI API integration ([ceed4ee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ceed4ee34749f8f01044c9939e9d2d226508f710))

## [0.3.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.2.1...v0.3.0) (2025-09-12)


### Features

* add version number and social links to app footer ([5a9bcfc](https://github.com/scepbjoern/fairment_Darmkur_App/commit/5a9bcfc074d790c4c8ad6f69c2d4d28d3d150c0d))

## [0.2.1](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.2.0...v0.2.1) (2025-09-10)

## 0.2.0 (2025-09-10)


### Features

* add automated database backup service with retention policy ([ebb8775](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ebb8775a9ccd2b8b215633abeec0cb5a426fa45e))
* add camera capture option for photo uploads alongside gallery picker ([6fa93ef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/6fa93ef10ae44c40358dd975080d660caa60ab4d))
* add configurable compression options for database backups ([7f737e6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/7f737e6d30754df21af269b91d09d3e4497226ae))
* add edit and delete functionality for notes and reflections ([fea9eb0](https://github.com/scepbjoern/fairment_Darmkur_App/commit/fea9eb054d49310d1516ed0b1033e5905d421066))
* add explanatory link to Bristol stool scale documentation ([aeec210](https://github.com/scepbjoern/fairment_Darmkur_App/commit/aeec2101e96fae00b2633d6c05ad42517d26a1f1))
* add PWA install prompt button to site navigation ([b75fb45](https://github.com/scepbjoern/fairment_Darmkur_App/commit/b75fb457b9b982c8f583f10534e38857facb59ad))
* add support for user-defined custom symptoms tracking ([f18f658](https://github.com/scepbjoern/fairment_Darmkur_App/commit/f18f658391c58dee7a0cc20a57e71f1c3ec20b6e))
* add user profile image support with avatar upload and cropping UI ([9387638](https://github.com/scepbjoern/fairment_Darmkur_App/commit/93876385eff04fd20b576d55b889e5ed30307dbb))
* add user-defined links with submenu in navigation ([d6cb212](https://github.com/scepbjoern/fairment_Darmkur_App/commit/d6cb21234616b5d302b70220a411578ba23ec452))
* implement analytics dashboard with weekly, phase and overall views ([fd3d717](https://github.com/scepbjoern/fairment_Darmkur_App/commit/fd3d71782cb6a27af9b6e87b1e39e50fd396794d))
* implement PDF export with daily entries, notes and optional photos ([8dc1728](https://github.com/scepbjoern/fairment_Darmkur_App/commit/8dc1728f4b13819b4a18d32715d279ca50a3627f))
* implement persistent theme switching with SSR support and cookie fallback ([15ed5ef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/15ed5eff304ebb40da089becca68614c7e04d184))
* improve postgres backup script with logging, error handling, and immediate backup on start ([764dbef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/764dbefdfd615ac09f55103c1457f3d3807709ce))


### Bug Fixes

* add null checks for symptoms data and update app icons with proper PWA support ([dac5fee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/dac5fee14cda705da085b66343dcfdf96bf0f897))
* escape shell variables with double $ in backup service script ([2987b6d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/2987b6dbd194b4c0438f6b612f0f1e885a0cd13f))
* escape timestamp variable in backup script to prevent shell expansion ([7982355](https://github.com/scepbjoern/fairment_Darmkur_App/commit/79823555972f6957e33228dde8cd84dea19b2347))
