# Owner-authorized first push (NOT run until approved)

Target:
https://github.com/nuvomailo-ci-lab/nuvomailo-ci-isolation-lab-20261028.git

```bash
OWNER=nuvomailo-ci-lab
REPO=nuvomailo-ci-isolation-lab-20261028
PUB=/opt/cursor/artifacts/nuvomailo-ci-public-harness

# Preconditions: repo exists, PUBLIC, empty; Cursor can push; Owner approved manifest
gh api "repos/$OWNER/$REPO" --jq '{private,visibility,size,permissions}'

cd "$PUB"
npm install --package-lock-only   # if lockfile needs refresh after review
git init -b main
git add -A
git -c user.name='NuvoMailo CI Lab' -c user.email='ci-lab@invalid.local' \
  commit -m 'ci-lab: public synthetic pool-isolation harness (e5b3c2e pattern)'
git remote add origin "https://github.com/$OWNER/$REPO.git"
git push -u origin main
```
