# Contributing to OpenArr

Thanks for helping out. The short version: keep it small, typed, tested, and
gracefully degrading.

## Setup

```bash
npm install
make dev              # Expo dev server (dev client)
make android          # debug build on a connected device
make android-install  # release APK installed via adb
```

You need the Android SDK (`ANDROID_HOME`, defaults to `~/Android/Sdk`) and a
device or emulator. There is no backend — the app talks directly to your own
Sonarr/Radarr/etc. instances, so you'll want at least one of them reachable to
test against.

## Before you open a PR

```bash
make typecheck   # must be clean
make test        # must pass
make lint
```

- Read `CLAUDE.md` first — it documents the architecture and the performance
  and security rules the codebase follows. PRs that regress them (extra polling
  loops, query-param auth, unbounded caches, per-screen status sweeps) will be
  asked to change.
- New service endpoints belong in that service's adapter with a jest test using
  the existing mocked-client pattern.
- Every view must handle the service being unconfigured or down: note card or
  empty state, never a crash.
- If your change alters anything described in `CLAUDE.md` (build, architecture,
  polling, storage, security), update `CLAUDE.md` in the same PR.

## Commits & PRs

- Conventional Commits: `type(scope): summary` — e.g. `fix(subs): retry
  provider search on timeout`. Imperative, lowercase, no trailing period.
- Keep PRs focused; describe what changed and why in a sentence or two.
- No AI/tool attribution in commit messages or PR descriptions.

## Reporting issues

Include the app version (Settings → About), the service and its version, and
whether the URL is local or remote. Never paste API keys or tokens — redact
them from logs and screenshots.
