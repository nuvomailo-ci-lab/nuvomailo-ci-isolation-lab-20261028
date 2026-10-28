# Publication safety assessment

## Original 272-file snapshot — NOT cleared for public release
The Phase-1 staging tree at
`/opt/cursor/artifacts/nuvomailo-ci-isolation-lab-staging` contains proprietary
NuvoMailo backend source (services, routes, mail runtime, billing/MFA/mailbox
logic, migrations, product tests). Removing secrets does **not** make that tree
safe to publish.

**Decision:** do not upload the 272-file snapshot to this PUBLIC repository.

## Public harness — intended publication set
Only the synthetic files under
`/opt/cursor/artifacts/nuvomailo-ci-public-harness` (see PUBLIC-MANIFEST.txt).
