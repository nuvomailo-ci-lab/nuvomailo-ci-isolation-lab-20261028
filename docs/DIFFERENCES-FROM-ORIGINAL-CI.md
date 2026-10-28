# Differences from original NuvoMailo CI

## Preserved characteristics
| Characteristic | Original | Public harness |
|----------------|----------|----------------|
| Node.js | 24.15.0 | 24.15.0 |
| PostgreSQL | 17 disposable Docker | 17 disposable Docker |
| Test runner | tsx --test | tsx --test |
| Concurrency | 1 | 1 |
| Isolation | process (hardened) | process (pinned) |
| Shared Pool lifecycle | product database.ts | synthetic src/database.mjs |
| Fail-closed exits | yes | yes |
| Sanitized diagnostics | yes | yes |
| Workflow permissions | contents: read | contents: read |

## Omitted (limits reproduction)
- All ~67 NuvoMailo backend product test files
- All backend application/services/routes/migrations
- Frontend typecheck/tests/builds
- Production compose verify + Python mail-lab/production suites
- Product env vars (JWT, bootstrap tokens, mail runtime, PUBLIC_DELIVERY paths)
- Dual-database groups (`nuvomailo` + `verification`)

## Consequence
This harness can confirm the **shared-pool / process-isolation** failure class
and runner hardening behavior. It cannot reproduce product-specific assertion
failures, mail delivery paths, or the full original `verify.yml` job matrix.
