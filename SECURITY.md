# Security Policy

## Supported versions

Only the latest `main` branch is supported with security updates.
Self-hosted instances should track `main` or a recent tagged release.

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Use [GitHub Security Advisories](https://github.com/slugylink/slugy/security/advisories/new)
(private report) including:

- Affected route, version/commit, and environment
- Reproduction steps or proof of concept
- Impact assessment (data exposure, auth bypass, open redirect, etc.)

We aim to acknowledge reports within 72 hours and will coordinate a fix and
disclosure timeline with you. Please give us a reasonable window before any
public disclosure.

## Scope notes

- `robots.txt` disallow rules are crawler etiquette, not access control —
  do not rely on them to protect private routes.
- Password-verified link cookies fall back to `BETTER_AUTH_SECRET` when
  `LINK_PASSWORD_COOKIE_SECRET` is unset; production deployments should set
  a dedicated secret (see `docs/self-hosting.md`).
