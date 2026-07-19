# OpenArr Development Guide

> Keep this file in sync with the code. If you change the architecture, build
> process, polling behavior, storage, or security posture described here,
> update this file in the same PR.

OpenArr is a React Native (Expo) Android app for managing a self-hosted media
stack: Sonarr, Radarr, Prowlarr, Bazarr, Transmission, Portainer, Gluetun and
Emby, with TMDB-powered discovery.

## Architecture

- **Expo SDK 55 / React Native 0.83, TypeScript.** Navigation is
  `@react-navigation` v7: a root native stack (Dashboard/Settings/setup screens)
  above a bottom-tab navigator (Home, Torrents, TV, Movies, Search, Subs,
  Infra), each tab holding its own native stack.
- **Service adapters** (`src/services/<service>/adapter.ts`): one class per
  service wrapping its REST API. `src/services/adapterFactory.ts` caches
  instances; `clearAdapters()` must be called whenever server config or
  connection mode changes. `src/core/api/httpClient.ts` builds the axios client
  and owns per-service auth (header names differ per service (see below)).
- **State** is zustand stores in `src/stores/`: `serverStore` (server/service
  configs, persisted), `connectionStore` (local/remote + manual mode override),
  `statusStore` (shared TTL'd health sweeps), `libraryStore` (tmdb-keyed
  library maps), `settingsStore`, `watchlistStore`.
- **Persistence** is MMKV (`src/core/storage/storage.ts`), encrypted with a
  per-device key derived from the Android ID (one-time recrypt migration from
  the legacy static key). Never reintroduce a constant encryption key.
- **UI system** lives in `src/core/components/` + `src/core/theme/tokens.ts`.
  Backgrounds render per-screen via the `screenLayout` wrapper in
  `AppBackground.tsx` (opaque layer per screen, prevents see-through during
  native-stack transitions). Native headers are transparent with a gradient
  fade (`headerFade`).

## Build & test

Everything goes through the Makefile:

```
make android-install   # release APK + adb install (primary dev loop)
make android           # debug build on device
make test              # jest (adapters, utils, stores)
make typecheck         # tsc --noEmit
make lint              # expo lint
```

Before any commit: `make typecheck` and `make test` must pass. The app version
is set only in `app.config.ts` (`version:`); the Settings screen reads the
baked-in version at runtime via `expo-application`, never hardcode it in UI.

## Performance rules

These were earned through profiling, don't regress them:

- **Polling is focus-gated and TTL'd.** `usePolling` only ticks while the
  screen is focused. Status checks go through `statusStore.refresh()` (20s TTL,
  in-flight coalescing, keyed by server), never add a second per-screen status
  sweep. Heavy content fetches must have their own TTL guard (see
  `SummaryScreen.fetchContent`, 5 min) because `usePolling` fires immediately
  on refocus.
- **Status endpoints must be cheap.** `getStatus()` implementations may not
  download libraries; use count/queue endpoints (`getQueue(1, 1)`).
- **List polling uses slim payloads.** Transmission list polling requests
  `LIST_FIELDS` only; full fields (files/fileStats) are fetched per-id in the
  detail view.
- **Lists**: FlashList for long lists, `React.memo` with field comparators for
  rows that re-render on poll ticks (see `TorrentItem`), cap mounted items in
  horizontal carousels (library rows cap at 30).
- **Backgrounds**: the poster wall renders only on top-level screens
  (`WALL_SCREENS` in `AppBackground.tsx`); pushed screens get the cheap
  gradient. Poster URLs load once per app session (module-level promise) and
  cache in MMKV for 24h.
- **Caches are bounded**: the OMDB ratings cache prunes at 2000 entries;
  discovery row cache TTL is 6h. New persistent caches need a size bound and
  an eviction story.
- **Server switches must invalidate**: anything cached per-server (statuses,
  adapters, queues, in-flight fetches) must be keyed by server id or guarded by
  a sequence check, see `statusStore`, `SummaryScreen.fetchSeq`,
  `useDownloadMonitor` baseline.

## Security rules

- **No secrets in source or git history.** The bundled TMDB/OMDB keys in
  `src/core/config.ts` are the only intentional exceptions (Overseerr-style
  shared client keys). `.env` is gitignored and never read by app code.
- **Auth travels in headers, never query params.** Per-service headers:
  `X-Api-Key` (arr apps), `X-API-KEY` (Bazarr), `X-API-Key` (Portainer, exact
  casing), `X-Emby-Token` (Emby, including image requests via
  `CachedImage headers`). Query-param keys leak into proxy logs and caches.
- **Storage**: MMKV encrypted with the per-device key; `allowBackup=false` in
  the Android manifest keeps credentials out of device/cloud backups. Backup
  exports are plaintext by design but write to the cache dir and delete after
  sharing.
- **Logging**: route errors through `logError` (`src/core/utils/log.ts`). It strips query strings, never prints headers, and is a no-op in release
  builds. Do not `console.error` raw axios errors.
- **Cleartext HTTP** is allowed (self-hosted LAN reality) but the UI warns when
  a remote URL uses `http://`. Don't remove that warning.

## Service API gotchas

- **Bazarr**: some endpoints wrap payloads in `{ data }`, others are bare, so always guard with `data.data ?? data`. Action endpoints take query args with
  string booleans (`"True"`/`"False"`), not JSON bodies.
- **Gluetun**: the control API lives at `/v1` on current builds and `/api/v1`
  on older custom builds, the adapter probes once and pins only on a definite
  404-style answer, never on a network error. Requires the custom fork (see
  README) because stock gluetun has no web UI.
- **Portainer**: self-signed HTTPS is unusable from RN (no way to skip cert
  validation), users must use the HTTP port or a proxy with a valid cert.
- **Radarr/Sonarr queue**: `includeUnknownSeriesItems` and
  `includeUnknownMovieItems` are service-specific; send both.
- **Transmission**: CSRF token dance on 409 is handled in the adapter; `/rpc`
  is appended automatically.
- **Emby**: watched-state matching uses TVDB episode ids first, then
  title|season|episode fallback. Per-user data uses the first `/Users` entry.

## Conventions

- Conventional Commits (`type(scope): summary`), imperative, lowercase, no
  trailing period. No AI/tool attribution anywhere in commits or PRs.
- Comments only where the code can't speak for itself (invariants, gotchas,
  non-obvious whys). Match surrounding style.
- All views must degrade gracefully when a service is unconfigured or
  unreachable: show a note ("X not connected"), never a crash or blank screen.
