# Alpha Release Guide (v10)

This guide covers how to create and publish alpha releases for the v10 branch to npm.

## Understanding the Release Structure

| Branch   | npm Tag  | Version Format   | Install Command                  |
| -------- | -------- | ---------------- | -------------------------------- |
| `master` | `latest` | `9.x.x`          | `npm i @react-three/fiber`       |
| `v10`    | `alpha`  | `10.0.0-alpha.x` | `npm i @react-three/fiber@alpha` |

**Important**: The `latest` tag is what users get by default when running `npm install`. We must ensure alpha releases are tagged as `alpha`, NOT `latest`.

---

## Prerequisites

Before releasing, ensure:

1. You are on the `v10` branch
2. All tests pass: `pnpm test`
3. Build succeeds: `pnpm build`
4. Bundle verification passes: `pnpm verify-bundles`

```bash
# Verify you're on the correct branch
git branch --show-current  # Should output: v10

# Run the full CI check
pnpm ci
```

---

## Step-by-Step Alpha Release Process

### 1. Verify Prerelease Mode

Check that prerelease mode is active:

```bash
# Should show: { "mode": "pre", "tag": "alpha", ... }
cat .changeset/pre.json
```

If the file doesn't exist, enter prerelease mode:

```bash
pnpm changeset pre enter alpha
```

This creates `.changeset/pre.json` which tells changesets to version packages as `X.X.X-alpha.X`.

### 2. Create a Changeset

Describe what changed in this release:

```bash
pnpm changeset:add
```

You'll be prompted to:

- Select which packages changed (use spacebar to select)
- Choose the bump type (major/minor/patch)
- Write a summary of changes

**Example changeset summary:**

```
Added WebGPU support with new entry point @react-three/fiber/webgpu
```

### 3. Version the Packages

Apply the changesets to update package versions:

```bash
pnpm vers
```

This will:

- Update `package.json` versions to something like `10.0.0-alpha.0`
- Generate/update `CHANGELOG.md` files
- Consume the changeset files

**Review the changes before committing:**

```bash
git diff
```

### 4. Commit the Version Bump

```bash
git add .
git commit -m "chore: version packages for alpha release"
git push origin v10
```

### 5. Build and Verify with Dry Run

Before publishing, build and verify what will be published:

```bash
# Build all packages
pnpm build

# Dry run to see exactly what will be published (without actually publishing)
cd packages/fiber && npm publish --dry-run --tag alpha
cd ../test-renderer && npm publish --dry-run --tag alpha
cd ../eslint-plugin && npm publish --dry-run --tag alpha
cd ../../
```

**What to check in dry-run output:**

- `dist/` folder is included (should see `dist/index.mjs`, `dist/legacy.mjs`, `dist/webgpu/index.mjs`, etc.)
- Package size looks reasonable (~1 MB for fiber, not ~100 KB)
- Version shows `-alpha.X` suffix

> **Why this matters**: The root `.gitignore` excludes `dist/`, which can cause npm to skip it.
> The `files` field in `package.json` whitelists what to include. If dist is missing,
> users will get a broken package!

### 6. Publish to npm with Alpha Tag

⚠️ **CRITICAL: Use the `--tag alpha` flag to avoid publishing to `latest`**

```bash
# Publish with alpha tag
pnpm changeset publish --tag alpha
```

Or manually for each package:

```bash
cd packages/fiber
npm publish --tag alpha --access public

cd ../test-renderer
npm publish --tag alpha --access public

cd ../eslint-plugin
npm publish --tag alpha --access public
```

### 7. Verify the Release

After publishing, verify the tags are correct:

```bash
# Check what version is on each tag
npm dist-tag ls @react-three/fiber
```

Expected output:

```
alpha: 10.0.0-alpha.0
latest: 9.x.x
```

**If you accidentally published to `latest`**, see the Emergency Recovery section below.

---

## Quick Reference Commands

```bash
# Enter alpha prerelease mode (first time only)
pnpm changeset pre enter alpha

# Add a changeset describing your changes
pnpm changeset:add

# Version packages (applies changesets)
pnpm vers

# Build packages
pnpm build

# Dry-run to verify package contents (IMPORTANT!)
cd packages/fiber && npm pack --dry-run

# Publish with alpha tag
pnpm changeset publish --tag alpha

# Exit prerelease mode (when ready for stable v10)
pnpm changeset pre exit

# Check npm tags
npm dist-tag ls @react-three/fiber
```

---

## Safety Checklist Before Publishing

Before running `pnpm changeset publish`:

- [ ] Verified on `v10` branch: `git branch --show-current`
- [ ] Prerelease mode is active: Check `.changeset/pre.json` exists
- [ ] Version looks correct: `grep version packages/fiber/package.json` shows `-alpha.X`
- [ ] Tests pass: `pnpm test`
- [ ] Build passes: `pnpm build`
- [ ] **Dry-run verified**: `npm publish --dry-run --tag alpha` shows `dist/` files included (~1 MB package size)
- [ ] Will use `--tag alpha` flag

---

## Emergency Recovery

### If You Accidentally Published to `latest`

If an alpha version was accidentally published as `latest`:

```bash
# 1. Move the alpha version to the alpha tag
npm dist-tag add @react-three/fiber@10.0.0-alpha.0 alpha

# 2. Restore the correct latest version
npm dist-tag add @react-three/fiber@9.x.x latest

# Replace 9.x.x with the actual last stable version number
```

Verify the fix:

```bash
npm dist-tag ls @react-three/fiber
```

### If You Need to Unpublish

npm has a 72-hour window for unpublishing:

```bash
npm unpublish @react-three/fiber@10.0.0-alpha.0
```

> **Warning**: Unpublishing can break users who have already installed that version.

---

## When Ready for Stable v10 Release

When v10 is ready to become the new stable version:

### 1. Exit Prerelease Mode

```bash
pnpm changeset pre exit
```

### 2. Create Final Changeset

```bash
pnpm changeset:add
```

### 3. Version as Stable

```bash
pnpm vers
```

This will produce `10.0.0` (no alpha suffix).

### 4. Publish to Latest

```bash
pnpm build
pnpm changeset publish  # No --tag flag = publishes to latest
```

### 5. Update Branch Strategy

After stable v10 release:

1. Merge `v10` into `master` or make `v10` the new default branch
2. Update `.changeset/config.json` baseBranch back to `master` if needed

---

## Troubleshooting

### "Cannot publish over existing version"

You're trying to publish a version that already exists. Either:

- Create a new changeset and run `pnpm vers` again
- Or increment the prerelease number manually

### Changesets not detecting changes

Make sure you're comparing against the correct base branch. Check `.changeset/config.json`:

```json
{
  "baseBranch": "v10"
}
```

### Version shows stable instead of alpha

Prerelease mode may not be active. Check for `.changeset/pre.json`:

```bash
cat .changeset/pre.json
```

If missing, re-enter prerelease mode:

```bash
pnpm changeset pre enter alpha
```

### Dry-run shows package is too small / missing dist/

If `npm pack --dry-run` shows ~100-200 KB instead of ~1 MB, the `dist/` folder is being excluded.

**Cause**: The root `.gitignore` has `dist/` which npm respects by default.

**Fix**: Ensure the package's `package.json` has a `files` field that explicitly includes `dist`:

```json
"files": [
  "dist",
  "react-reconciler",
  "readme.md"
]
```

The `files` field acts as a whitelist and overrides `.gitignore` for publishing.

---

## NPM Tags Explained

| Tag      | Purpose                                  | Command to Install               |
| -------- | ---------------------------------------- | -------------------------------- |
| `latest` | Default stable release                   | `npm i @react-three/fiber`       |
| `alpha`  | Early preview, may have breaking changes | `npm i @react-three/fiber@alpha` |
| `beta`   | Feature complete, testing stability      | `npm i @react-three/fiber@beta`  |
| `rc`     | Release candidate, final testing         | `npm i @react-three/fiber@rc`    |
| `next`   | Alternative for bleeding edge            | `npm i @react-three/fiber@next`  |

Users on `latest` will **never** automatically get alpha versions - they must explicitly opt-in with `@alpha`.
