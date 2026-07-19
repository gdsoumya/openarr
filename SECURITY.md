# Security Policy

OpenArr talks directly to services you host; it stores their API keys encrypted
on-device and never sends data anywhere else.

## Reporting a vulnerability

Please do not open public issues for security problems. Use GitHub's private
vulnerability reporting on this repository (Security → Report a vulnerability).
You'll get a response within a week.

## Scope notes

- Cleartext HTTP is intentionally allowed for LAN use; the app warns when a
  remote URL uses `http://`.
- The bundled TMDB/OMDB keys in `src/core/config.ts` are shared client keys by
  design, not leaked secrets.
