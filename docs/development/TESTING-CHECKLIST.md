# Yarn 4 Migration - Testing Checklist

Complete this checklist to ensure the Yarn 4 migration didn't break anything.

## Prerequisites

```bash
# 1. Enable Corepack (installs Yarn 4)
corepack enable

# 2. Verify Yarn version (should be 4.5.3)
yarn --version

# 3. Clean existing installation
rm -rf node_modules
rm yarn.lock
```

## 🔧 Installation & Setup

### Test 1: Fresh Install

```bash
yarn install
```

**Expected Result:**

- ✅ Installs successfully
- ✅ Creates `node_modules/` directory
- ✅ Creates new `yarn.lock` file
- ✅ Runs `postinstall` hook (stubs + patch-react-reconciler)
- ✅ No errors or warnings about missing dependencies

**Look for:**

- Faster install time compared to Yarn 1 (~20-30% improvement)
- Clean terminal output, no deprecation warnings

---

### Test 2: Workspace Resolution

```bash
# Check that workspaces are properly linked
ls -la node_modules/@react-three/
```

**Expected Result:**

- ✅ `fiber/` symlink points to `packages/fiber`
- ✅ `eslint-plugin/` symlink points to `packages/eslint-plugin`
- ✅ `test-renderer/` symlink points to `packages/test-renderer`

---

## 📦 Build System

### Test 3: Stub Generation

```bash
yarn stub
# or
yarn dev
```

**Expected Result:**

- ✅ Creates stubs in `packages/fiber/dist/`
- ✅ Creates stubs in `packages/eslint-plugin/dist/`
- ✅ No errors during stub creation

**Verify stub files exist:**

```bash
ls packages/fiber/dist/
# Should see: index.mjs, legacy.mjs, webgpu/index.mjs
```

---

### Test 4: Production Build

```bash
yarn build
```

**Expected Result:**

- ✅ Builds `@react-three/fiber` successfully
- ✅ Builds `@react-three/eslint-plugin` successfully
- ✅ Creates CJS and ESM outputs
- ✅ No TypeScript errors
- ✅ No unbuild errors

**Verify output:**

```bash
ls packages/fiber/dist/
# Should see:
# - index.cjs, index.mjs
# - legacy.cjs, legacy.mjs
# - webgpu/index.cjs, webgpu/index.mjs
```

---

### Test 5: Bundle Verification

```bash
yarn verify-bundles
```

**Expected Result:**

- ✅ Script runs successfully
- ✅ No bundle integrity issues
- ✅ Proper tree-shaking verified

---

## 🧪 Testing

### Test 6: Unit Tests

```bash
yarn test
```

**Expected Result:**

- ✅ All tests pass
- ✅ No module resolution errors
- ✅ Coverage report generated

**Critical areas to check:**

- `bundles.test.ts` - Verifies THREE.js import resolution
- `canvas.test.tsx` - Core functionality
- `hooks.test.tsx` - React hooks
- `reconciler.test.ts` - React reconciler integration

---

### Test 7: Watch Mode

```bash
yarn test:watch
```

**Expected Result:**

- ✅ Enters watch mode successfully
- ✅ Re-runs tests on file changes
- ✅ Press `q` to exit cleanly

---

## 🎨 Linting & Formatting

### Test 8: TypeScript Check

```bash
yarn typecheck
```

**Expected Result:**

- ✅ No TypeScript errors
- ✅ All types resolve correctly

---

### Test 9: ESLint

```bash
yarn eslint
```

**Expected Result:**

- ✅ No linting errors
- ✅ ESLint properly resolves workspace packages

**If there are errors:**

```bash
yarn eslint:fix
```

---

### Test 10: Prettier

```bash
yarn format
```

**Expected Result:**

- ✅ No formatting issues
- ✅ All files properly formatted

**If there are issues:**

```bash
yarn format:fix
```

---

## 🌐 Example App

### Test 11: Run Example App

```bash
yarn examples
```

**Expected Result:**

- ✅ Vite dev server starts on `http://localhost:5173`
- ✅ Example app loads without errors
- ✅ Hot reload works when editing source files

**Test in browser:**

1. Open `http://localhost:5173`
2. Check browser console for errors
3. Test different examples from the dropdown:
   - Default examples (WebGL + WebGPU)
   - Legacy examples (WebGL only)
   - WebGPU examples (WebGPU only)
4. Verify 3D scenes render correctly
5. Check interactivity (mouse/touch events)

---

## 🔄 Full CI Simulation

### Test 12: Full CI Suite

```bash
yarn ci
```

This runs: `build && typecheck && eslint && dev && test && format`

**Expected Result:**

- ✅ All commands pass sequentially
- ✅ No errors or warnings
- ✅ Takes reasonable time (note: first build is slower)

---

## 🔍 Edge Cases

### Test 13: Package Dependencies

```bash
# Check for phantom dependencies
yarn dlx @yarnpkg/doctor .
```

**Expected Result:**

- ✅ No phantom dependencies detected (packages importing things not in their dependencies)

---

### Test 14: Workspace Scripts

```bash
# Test workspace-specific commands
yarn workspace @react-three/fiber build
yarn workspace @react-three/eslint-plugin build
```

**Expected Result:**

- ✅ Individual package builds work
- ✅ Workspace isolation maintained

---

### Test 15: Changesets (Publishing)

```bash
yarn changeset:add
```

**Expected Result:**

- ✅ Changeset CLI launches
- ✅ Can select packages and bump types
- ✅ Press Ctrl+C to cancel (don't actually create changeset)

---

## 🧹 Cleanup Tests

### Test 16: Clean Install

```bash
# Remove everything and reinstall
rm -rf node_modules packages/*/node_modules example/node_modules
rm yarn.lock
yarn install
```

**Expected Result:**

- ✅ Fresh install succeeds
- ✅ All tests still pass

---

### Test 17: Cache Behavior

```bash
# Second install should be much faster
rm -rf node_modules packages/*/node_modules example/node_modules
yarn install
```

**Expected Result:**

- ✅ Install is significantly faster (using Yarn 4 cache)
- ✅ No network requests for cached packages

---

## 🚨 Known Issues to Watch For

### Potential Problems:

1. **Symlink Issues on Windows**

   - Symptom: `EPERM: operation not permitted, symlink`
   - Solution: Enable Windows Developer Mode
   - See: CONTRIBUTING.md for instructions

2. **Binary Package Issues**

   - Some native modules might need rebuilding
   - Run: `yarn rebuild` if needed

3. **React Reconciler Patch**

   - Symptom: Build errors related to react-reconciler
   - Solution: Manually run `yarn patch-react-reconciler`
   - Check: `packages/fiber/react-reconciler/` exists

4. **Husky Hooks**
   - Symptom: Git hooks not running
   - Solution: Run `yarn prepare` manually

---

## ✅ Success Criteria

All of the following must pass:

- [ ] Fresh install completes without errors
- [ ] Stubs generate correctly
- [ ] Production build succeeds
- [ ] Bundle verification passes
- [ ] All unit tests pass
- [ ] TypeScript check passes
- [ ] Linting passes
- [ ] Example app runs and renders correctly
- [ ] Full CI suite passes
- [ ] No phantom dependencies
- [ ] Clean reinstall works
- [ ] GitHub Actions CI passes (after merge/push)

---

## 📊 Performance Comparison

Track these metrics before/after migration:

| Metric         | Yarn 1   | Yarn 4   | Improvement |
| -------------- | -------- | -------- | ----------- |
| Fresh install  | \_\_\_ s | \_\_\_ s | \_\_\_ %    |
| Cached install | \_\_\_ s | \_\_\_ s | \_\_\_ %    |
| CI suite       | \_\_\_ s | \_\_\_ s | \_\_\_ %    |

---

## 🐛 If Something Breaks

### Quick Rollback:

```bash
# 1. Revert package.json
git checkout HEAD -- package.json

# 2. Remove Yarn 4 config
rm .yarnrc.yml

# 3. Restore old lock file
git checkout HEAD -- yarn.lock

# 4. Reinstall with Yarn 1
yarn install
```

### Report Issues:

If you find migration-specific issues:

1. Check `YARN4-MIGRATION.md` troubleshooting section
2. Check `docs/BUILD.md` for tooling details
3. Document the issue clearly with reproduction steps

---

## 🔄 GitHub Actions CI

After merging/pushing, verify the CI workflows pass:

1. Go to: https://github.com/pmndrs/react-three-fiber/actions
2. Check that the **Test** workflow completes successfully
3. Verify both React matrix jobs (19.0.0 and latest) pass
4. Check that the **Build documentation** workflow passes

**What to watch for:**

- ✅ Corepack enables Yarn 4 correctly
- ✅ `yarn --immutable` installs dependencies
- ✅ All test steps pass (build, typecheck, eslint, test)
- ✅ Cache works correctly (faster subsequent runs)

**If CI fails:**

- Check the logs for Yarn-related errors
- Verify `corepack enable` step ran
- Check cache is being restored/saved correctly
- Compare local test results vs CI

---

## 📝 Notes

Use this space to document any issues or observations:

```
[Date] [Your Name]

Issues Found:
-

Performance Notes:
-

Other Observations:
-
```
