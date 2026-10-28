# NuvoMailo CI Isolation Lab (PUBLIC synthetic harness)

**This repository does not contain NuvoMailo product source code.**

It is a disposable synthetic GitHub Actions harness that reproduces one CI failure
class observed while investigating NuvoMailo backend tests:

> Shared `pg.Pool` + `pool.end()` in per-file `after()` hooks fails under
> Node.js test runner `--test-isolation=none` / shared process, and passes when
> `--test-isolation=process` is pinned.

## What this preserves
- Node.js `24.15.0`
- Disposable PostgreSQL 17 (Docker, loopback-only publish)
- `tsx --test --test-concurrency=1 --test-isolation=process`
- Fail-closed Postgres readiness / spawn / signal exit handling
- Bounded sanitized failure diagnostics (`contents: read` only)

## What this does NOT include
- NuvoMailo backend application source, migrations, or product tests
- SMTP/IMAP/OVH/customer data/production credentials
- Frontend, production compose, or deployment workflows

A green run here validates the isolation harness pattern. It does **not** prove
that historical failures in the private product repository are fixed.
