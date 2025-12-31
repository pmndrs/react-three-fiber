# Build System & Tooling

This document explains the build system, package manager, and tooling choices for `@react-three/fiber`.

## Table of Contents

- [Package Manager: Yarn 4](#package-manager-yarn-4)
- [Build System: Unbuild](#build-system-unbuild)
- [Migration History](#migration-history)
- [Future Considerations](#future-considerations)

---

## Package Manager: Yarn 4

### Current Setup

We use **Yarn 4** (Berry) with `nodeLinker: node-modules` mode, providing modern Yarn features while maintaining compatibility with traditional workflows.

**Configuration:** [`.yarnrc.yml`](../.yarnrc.yml)

```yaml
nodeLinker: node-modules
```

### Why Yarn 4?

**Benefits:**

- ✅ **Better performance** - Faster installs and improved caching vs Yarn 1
- ✅ **Modern workspace protocol** - `workspace:*` for monorepo dependencies
- ✅ **Active development** - Yarn 1 is in maintenance mode only
- ✅ **Better tooling** - Constraints, releases, and improved DX
- ✅ **Zero breaking changes** - With `nodeLinker: node-modules`, behavior is identical to Yarn 1

**Migration from Yarn 1:**

- Updated `packageManager` field in root `package.json`
- Created `.yarnrc.yml` with `nodeLinker: node-modules`
- No changes to scripts, dependencies, or workflows
- CI/CD works identically

### Why NOT Plug'n'Play (PnP)?

While Yarn's PnP mode offers significant performance benefits, we're staying with traditional `node_modules` for now due to:

**Compatibility Concerns:**

1. **Jest Integration** - Our test suite uses Jest which requires additional configuration for PnP

   - Would need `@yarnpkg/pnpify` or jest-pnp-resolver
   - Coverage setup can be finicky
   - Adds complexity to test configuration

2. **Contributor Experience** - Lower friction for new contributors

   - No need to run `yarn dlx @yarnpkg/sdks` for editor setup
   - No `.yarn/sdks` directory to commit
   - Debugging is more straightforward
   - Error messages are familiar

3. **Ecosystem Compatibility** - Some tools we use occasionally:

   - React Native / Metro bundler (for related projects)
   - Physics engines with WASM (Rapier, Jolt)
   - Binary packages that may need `packageExtensions` config

4. **Minimal Gains for Libraries** - PnP benefits are most pronounced for applications
   - As a library, our install times are already fast
   - CI time savings would be modest
   - The complexity tradeoff isn't worth it yet

---

## Build System: Unbuild

### Current Setup

We use **[unbuild](https://github.com/unjs/unbuild)** for building all packages.

**Configuration:** [`packages/fiber/build.config.ts`](../packages/fiber/build.config.ts)

### Why Unbuild?

Unbuild provides per-entry-point build configuration, which is critical for our THREE.js import strategy.

**Key Features:**

1. **Per-Entry Alias Resolution** - Each entry point can resolve imports differently:

   ```typescript
   // All source files import from #three
   import { WebGLRenderer } from '#three'

   // During build, #three resolves differently:
   // - Default entry: src/three/index.ts (WebGL + WebGPU)
   // - Legacy entry: src/three/legacy.ts (WebGL only)
   // - WebGPU entry: src/three/webgpu.ts (WebGPU only)
   ```

2. **Stub Mode for Development** - `unbuild --stub` creates lightweight stubs:

   ```javascript
   // dist/index.mjs (stub)
   import * as module from '../src/index.tsx'
   export * from '../src/index.tsx'
   export default module.default
   ```

   This means code changes are reflected immediately without rebuilding.

3. **No Shared Chunks** - Each entry is a standalone bundle, preventing the shared chunk issues we had with Preconstruct.

### Build Outputs

```
packages/fiber/dist/
├── index.cjs          # Default entry (CommonJS)
├── index.mjs          # Default entry (ESM)
├── legacy.cjs         # Legacy/WebGL-only (CommonJS)
├── legacy.mjs         # Legacy/WebGL-only (ESM)
└── webgpu/
    ├── index.cjs      # WebGPU-only (CommonJS)
    └── index.mjs      # WebGPU-only (ESM)
```

### Development Workflow

```bash
# Install and stub (automatic)
yarn install

# Manual stub generation
yarn stub
# or
yarn dev

# Production build
yarn build

# Verify bundle integrity
yarn verify-bundles
```

See [DEVELOPMENT](./DEVELOPMENT.md) for detailed development workflows.

---

## Migration History

### From Preconstruct to Unbuild (v10.0.0)

**Date:** Late 2025

**Reason:** Preconstruct couldn't support per-entry alias resolution, which is essential for our THREE.js import strategy.

**Problems with Preconstruct:**

1. **No Per-Entry Aliases** - Impossible to have different `#three` resolution per entry point

   - All entries shared the same import resolution
   - Couldn't create separate WebGL-only and WebGPU-only bundles

2. **Physical Folder Hacks** - Required creating stub `package.json` files in folders:
   ```
   legacy/package.json  → {"main": "../dist/legacy.cjs"}
   webgpu/package.json  → {"main": "../dist/webgpu.cjs"}
   ```
3. **Shared Chunks** - Created shared dependencies between entries

   - Users would get multiple files for a single import
   - Tree-shaking was less predictable

4. **Development Mode Issues** - `preconstruct dev` had limitations with TypeScript path mapping

**Migration Impact:**

- ✅ Simpler project structure (no stub folders)
- ✅ Better tree-shaking and bundle optimization
- ✅ Per-entry THREE.js import control
- ✅ Faster development with better stub support
- ✅ More predictable builds

**Breaking Changes:**

- None for end users - package exports remained the same
- Internal build process changed completely
- Development setup simplified

**CI/CD:** This project uses GitHub Actions (`.github/workflows/test.yml`) which has been updated for Yarn 4.

### From Yarn 1 to Yarn 4 (v10.0.0)

**Date:** Late 2025

**Reason:** Yarn 1 is in maintenance-only mode, and Yarn 4 offers better performance and DX with zero breaking changes when using `nodeLinker: node-modules`.

**Changes:**

- Updated `packageManager` field
- Created `.yarnrc.yml` with `nodeLinker: node-modules`
- No changes to scripts, dependencies, or CI

**Migration Impact:**

- ✅ Faster installs (~20-30% improvement)
- ✅ Better caching and deduplication
- ✅ Access to modern Yarn features
- ✅ Zero breaking changes for contributors

**Why Now:**

- Preconstruct (which had Yarn 2+ compatibility issues) is gone
- Unbuild works perfectly with Yarn 4
- Minimal risk, maximum benefit

---

## Future Considerations

### Potential Future Changes

### What Would PnP Migration Require?

If we decide to enable PnP in the future, here's what it would take:

**Configuration:**

```yaml
# .yarnrc.yml
nodeLinker: pnp
pnpMode: loose # Recommended for libraries
```

**Jest Setup:**

```javascript
// jest.config.js
resolver: 'jest-pnp-resolver',
// OR
moduleNameMapper: {
  // Custom mappings for PnP resolution
}
```

**SDK Setup:**

```bash
# Generate editor SDKs (required for TypeScript, ESLint, etc.)
yarn dlx @yarnpkg/sdks vscode
```

**Commit Requirements:**

- Commit `.yarn/sdks/` directory
- Commit `.pnp.cjs` and `.pnp.loader.mjs` (or use Zero-Installs)
- Update contributor documentation

**Estimated Effort:** 2-4 hours for migration + testing, ongoing maintenance for edge cases

**Decision:** We'll revisit PnP if Jest adds native PnP support or if contributor friction decreases.

1. **Plug'n'Play (PnP)**

   - **When:** If Jest adds native PnP support, or contributor friction is resolved
   - **Benefit:** 40-60% faster installs, strict dependency enforcement
   - **Effort:** ~4 hours migration + ongoing edge case handling

2. **Bun Runtime**

   - **When:** Bun stabilizes monorepo tooling and test runner
   - **Benefit:** Even faster installs/builds, unified runtime
   - **Risk:** Early ecosystem, potential compatibility issues

3. **Turbo/Nx Monorepo Tools**

   - **When:** Project scales significantly or CI times become problematic
   - **Benefit:** Task caching, distributed builds
   - **Effort:** High (requires restructuring workflows)

4. **TypeScript 5.x Project References**
   - **When:** TypeScript performance becomes a bottleneck
   - **Benefit:** Faster type checking in monorepo
   - **Effort:** Medium (requires tsconfig restructuring)

### Decision Framework

We evaluate tooling changes based on:

- ✅ **Measurable benefit** - Performance, DX, or capability improvement
- ✅ **Ecosystem stability** - Mature tools with active maintenance
- ✅ **Contributor experience** - Lower friction, not higher
- ✅ **Migration cost** - Reasonable effort vs benefit tradeoff
- ✅ **Maintenance burden** - Doesn't add ongoing complexity

---

## Questions?

- See [DEVELOPMENT](./DEVELOPMENT) for day-to-day development workflows
- See [CONTRIBUTING](../CONTRIBUTING) for contribution guidelines
- See the [unbuild config](../packages/fiber/build.config.ts) for technical details
