# Yarn 4 Migration Checklist

This document tracks the migration from Yarn 1 to Yarn 4.

## ✅ Completed

- [x] Updated `packageManager` field to `yarn@4.5.3`
- [x] Created `.yarnrc.yml` with `nodeLinker: node-modules` configuration
- [x] Updated `.gitignore` for Yarn 4 files
- [x] Updated `CONTRIBUTING.md` to reference Yarn 4 and remove Preconstruct mentions
- [x] Created comprehensive `docs/BUILD.md` explaining tooling decisions
- [x] Updated `docs/DEVELOPMENT.md` with Yarn 4 setup instructions
- [x] Removed old `docs/PRECONSTRUCT-TO-UNBUILD.md` (content consolidated)
- [x] Created `docs/README.md` for documentation navigation

## 🔄 Next Steps (To Be Done)

### 1. Install Yarn 4 and Regenerate Lock File

```bash
# Enable Corepack (ships with Node 16.10+)
corepack enable

# This will download Yarn 4.5.3 as specified in packageManager field
yarn --version

# Clean install to regenerate yarn.lock with Yarn 4
rm -rf node_modules
rm yarn.lock
yarn install
```

### 2. Verify Everything Works

```bash
# Test stub generation
yarn stub

# Run tests
yarn test

# Build packages
yarn build

# Verify bundles
yarn verify-bundles

# Test examples
yarn examples
```

### 3. ✅ CI/CD Updated

**GitHub Actions workflows have been updated:**

- ✅ `.github/workflows/test.yml` - Added `corepack enable` step
- ✅ Updated cache keys to include `yarn4` prefix
- ✅ Updated cache path to `~/.yarn/berry/cache` (Yarn 4 global cache)
- ✅ `.github/workflows/docs.yml` - Uses reusable workflow (should auto-handle Yarn)

**Changes made to `test.yml`:**

```yaml
- name: Enable Corepack (for Yarn 4)
  run: corepack enable
```

CI should work immediately after merging these changes.

### 4. Commit Changes

```bash
# Stage all migration files
git add .yarnrc.yml
git add .gitignore
git add package.json
git add yarn.lock
git add CONTRIBUTING.md
git add docs/BUILD.md
git add docs/DEVELOPMENT.md
git add docs/README.md
git add YARN4-MIGRATION.md

# Commit
git commit -m "chore: migrate from Yarn 1 to Yarn 4

- Update packageManager to yarn@4.5.3
- Configure Yarn 4 with nodeLinker: node-modules for compatibility
- Consolidate build documentation in docs/BUILD.md
- Update contributor documentation
- Remove outdated Preconstruct migration docs

BREAKING CHANGE: Contributors must use Yarn 4+ (enable with 'corepack enable')
"
```

### 5. Update Team

Notify contributors about the change:

- Yarn 4 is now required
- Run `corepack enable` to install Yarn 4
- Workflow remains identical to Yarn 1
- No PnP mode - using traditional node_modules

### 6. Clean Up This File

Once migration is complete and verified, delete `YARN4-MIGRATION.md`.

## Troubleshooting

### Issue: `yarn: command not found` after migration

**Solution:** Run `corepack enable` to install Yarn 4

### Issue: Different Yarn version installed

**Solution:** The `packageManager` field pins the exact version. Corepack will use it automatically.

### Issue: Workspace resolution errors

**Solution:** Delete `node_modules` and `yarn.lock`, then run `yarn install` fresh

### Issue: Stub generation fails

**Solution:**

```bash
yarn stub
# or
yarn dev
```

## Rollback Plan

If issues arise, rollback is simple:

1. Revert `package.json` packageManager field to `yarn@1.22.22+sha512...`
2. Delete `.yarnrc.yml`
3. Restore old `yarn.lock` from git history
4. Run `yarn install` with Yarn 1

## Questions?

See [docs/BUILD.md](./docs/BUILD.md) for detailed explanation of tooling decisions.
