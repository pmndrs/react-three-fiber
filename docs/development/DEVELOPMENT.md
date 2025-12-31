# Development Guide

This guide covers how to develop `@react-three/fiber` locally.

> **Note:** For information about our build system, package manager choices, and migration history, see [BUILD](./BUILD.md).

## Quick Start

```bash
# Install dependencies with Yarn 4 (automatically runs yarn stub)
yarn install

# Start developing
yarn dev
```

## Build System Overview

R3F uses **[unbuild](https://github.com/unjs/unbuild)** for building. Key features:

| Feature         | Capability                                         |
| --------------- | -------------------------------------------------- |
| Dev mode        | `unbuild --stub` - instant code reflection         |
| Build           | `unbuild` - optimized production bundles           |
| Per-entry alias | Different THREE.js resolution per entry point      |
| Standalone      | Each entry is a complete bundle (no shared chunks) |

See [BUILD](./BUILD.md) for the full story on why we use unbuild and our tooling choices.

## Development Commands

### `yarn stub` (Development Mode)

**(You probably never need to run this, this is done for you)**

Creates stub files that point to source code, allowing you to develop without rebuilding:

```bash
yarn stub
# or
yarn dev  # alias for yarn stub
```

This is run automatically after `yarn install` via the `postinstall` script.

**What it does:**

- Creates `dist/index.mjs` → points to `src/index.tsx`
- Creates `dist/legacy.mjs` → points to `src/legacy.tsx`
- Creates `dist/webgpu/index.mjs` → points to `src/webgpu/index.tsx`

**Stub file example:**

```javascript
// dist/index.mjs (stub)
import * as module from '../src/index.tsx'
export * from '../src/index.tsx'
export default module.default
```

This means:

- Your code changes are reflected immediately (no rebuild needed)
- TypeScript types come from source files
- Hot reload works in consuming apps

### `yarn build` (Production Build)

Creates optimized production bundles with per-entry THREE.js resolution.

You need to run `yarn build` when:

- Preparing for release/publish
- Testing actual bundle output
- Verifying THREE.js import resolution

You do NOT need to rebuild for:

- Normal development
- Testing source code changes
- Running Jest tests

```bash
yarn build
```

**Output:**

```
dist/
  index.cjs      # Default entry (CommonJS)
  index.mjs      # Default entry (ESM)
  legacy.cjs     # Legacy entry (CommonJS)
  legacy.mjs     # Legacy entry (ESM)
  webgpu/
    index.cjs    # WebGPU entry (CommonJS)
    index.mjs    # WebGPU entry (ESM)
```

## How Alias Resolution Works

The key feature of unbuild is **per-entry-point alias resolution**. All source files import from `#three`:

```typescript
// src/core/renderer.tsx
import { WebGLRenderer, WebGPURenderer } from '#three'
```

During build, `#three` resolves differently for each entry:

| Entry   | `#three` resolves to  | Result              |
| ------- | --------------------- | ------------------- |
| Default | `src/three/index.ts`  | Both WebGL + WebGPU |
| Legacy  | `src/three/legacy.ts` | WebGL only          |
| WebGPU  | `src/three/webgpu.ts` | WebGPU only         |

This is configured in `packages/fiber/build.config.ts`:

```typescript
function createAliasPlugin(threeVariant: 'default' | 'legacy' | 'webgpu') {
  return alias({
    entries: [
      { find: /^#three$/, replacement: threeAliases[threeVariant] },
      // ...
    ],
  })
}
```

## Development Workflow

### 1. Initial Setup

```bash
git clone https://github.com/pmndrs/react-three-fiber.git
cd react-three-fiber

# Install Yarn 4 if you don't have it
corepack enable

# Install dependencies (automatically runs yarn stub)
yarn install
```

> **Note:** We use Yarn 4 (Berry) with `nodeLinker: node-modules`. If you're coming from Yarn 1, everything works the same way. See [BUILD.md](./BUILD) for details.

### 2. Making Changes

Edit source files in `packages/fiber/src/`. Changes are picked up immediately because stubs point to source.

```bash
# Edit a file
code packages/fiber/src/core/hooks/useFrame.tsx

# Changes are immediately available - no rebuild needed
```

### 3. Testing Changes

```bash
# Run tests
yarn test

# Run specific test
yarn test packages/fiber/tests/bundles.test.ts

# Watch mode
yarn test:watch
```

### 4. Testing with Example App

```bash
# Start the example app
yarn examples

# Navigate to http://localhost:5173
```

### 5. Building for Production

```bash
# Build
yarn build

# Verify bundle optimization
yarn verify-bundles
```

## Testing

R3F uses a combination of Jest tests and bundle verification to ensure correctness across all entry points. For comprehensive testing information, see the [Testing Guide](./TESTING.md).

### Quick Testing Commands

```bash
# Run all Jest tests
yarn test

# Run specific test file
yarn test packages/fiber/tests/bundles.test.ts

# Watch mode
yarn test:watch

# Build and verify bundles
yarn build && yarn verify-bundles
```

### Testing Overview

**Jest Tests**

Jest tests run against source files and verify that all exports work correctly. However, they use babel which resolves `#three` to the default variant for all tests.

**Bundle Verification**

The `verify-bundles.js` script analyzes the actual built output to ensure each entry point has the correct THREE.js imports:

- **Default**: Contains both `three` and `three/webgpu`
- **Legacy**: Contains only `three` (no WebGPU imports)
- **WebGPU**: Contains only `three/webgpu` (no legacy imports)

For detailed testing workflows, troubleshooting, and adding new tests, see [TESTING](./TESTING.md).

## Project Structure

```
packages/fiber/
├── src/
│   ├── index.tsx           # Default entry point
│   ├── legacy.tsx          # Legacy entry point
│   ├── webgpu/
│   │   └── index.tsx       # WebGPU entry point
│   ├── core/               # Core R3F code
│   └── three/              # THREE.js re-exports
│       ├── index.ts        # Default (WebGL + WebGPU)
│       ├── legacy.ts       # Legacy (WebGL only)
│       ├── webgpu.ts       # WebGPU only
│       └── tsl.ts          # TSL re-exports
├── types/                  # TypeScript type definitions
├── tests/                  # Test files
├── dist/                   # Built output (generated)
├── build.config.ts         # Unbuild configuration
└── package.json
```

## Configuration Files

### `build.config.ts`

Unbuild configuration with three build entries:

```typescript
export default defineBuildConfig([
  {
    name: 'default',
    entries: ['src/index.tsx'],
    // #three → src/three/index.ts
  },
  {
    name: 'legacy',
    entries: ['src/legacy.tsx'],
    // #three → src/three/legacy.ts
  },
  {
    name: 'webgpu',
    entries: ['src/webgpu/index.tsx'],
    // #three → src/three/webgpu.ts
  },
])
```

### `babel.config.js`

Used for Jest testing. Resolves `#three` to default for all tests:

```javascript
alias: {
  '#three': './packages/fiber/src/three/index.ts',
  '#types': './packages/fiber/types/index.ts',
}
```

### `jest.config.js`

Maps package imports to source files for testing:

```javascript
moduleNameMapper: {
  '^@react-three/fiber$': '<rootDir>/packages/fiber/src/index.tsx',
  '^@react-three/fiber/legacy$': '<rootDir>/packages/fiber/src/legacy.tsx',
  '^@react-three/fiber/webgpu$': '<rootDir>/packages/fiber/src/webgpu/index.tsx',
}
```

## Adding New Features

### Adding to all entry points

1. Add code to `src/core/`
2. Export from `src/core/index.tsx`
3. It will be available in all entry points automatically

### Adding WebGPU-specific features

1. Add code to `src/webgpu/`
2. Export from `src/webgpu/index.tsx`
3. It will only be in the `@react-three/fiber/webgpu` entry

### Adding a new THREE.js import

If you need a new THREE.js export:

1. Add to `src/three/index.ts` (for default/both)
2. Add to `src/three/legacy.ts` (if WebGL-compatible)
3. Add to `src/three/webgpu.ts` (if WebGPU-compatible)

## Adding a New Entry Point

1. Create entry file in `src/`:

   ```typescript
   // src/my-entry.tsx
   export * from './core'
   export { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'
   ```

2. Create THREE variant in `src/three/`:

   ```typescript
   // src/three/my-variant.ts
   export const R3F_BUILD_LEGACY = true
   export const R3F_BUILD_WEBGPU = false
   export * from 'three'
   ```

3. Add to `build.config.ts`:

   ```typescript
   {
     name: 'my-entry',
     entries: ['src/my-entry.tsx'],
     outDir: 'dist',
     hooks: {
       'rollup:options': (_ctx, options) => {
         options.plugins = [
           createAliasPlugin('my-variant'),
           // ...
         ]
       },
     },
   }
   ```

4. Add to `package.json` exports:

   ```json
   "./my-entry": {
     "types": "./src/my-entry.tsx",
     "import": "./dist/my-entry.mjs",
     "require": "./dist/my-entry.cjs"
   }
   ```

5. Update `verify-bundles.js` and add tests.

## Troubleshooting

### Changes not reflected

Make sure stubs are generated:

```bash
yarn stub
```

### Import errors in IDE

Restart TypeScript server in your IDE, or run:

```bash
yarn typecheck
```

### Build fails with alias errors

Check that `#three` and `#types` aliases are correctly configured in `build.config.ts`.

### Jest tests fail with module errors

Ensure babel config has the aliases and Jest config maps packages to source.

## CI/CD

For CI pipelines using Yarn 4:

```yaml
steps:
  # Enable Corepack for Yarn 4
  - run: corepack enable

  # Install dependencies
  - run: yarn install

  # Build and verify
  - run: yarn build
  - run: yarn verify-bundles
  - run: yarn test
```

> **Note:** The `packageManager` field in `package.json` pins the exact Yarn version, so `corepack enable` ensures consistency across environments.

## Release Process

For the current Alpha Stage see [ALPHA RELEASE](./ALPHA-RELEASE.md)

```bash
# 1. Make sure everything passes
yarn build && yarn verify-bundles && yarn test

# 2. Create changeset
yarn changeset:add

# 3. Version packages
yarn vers

# 4. Release
yarn release
```
