# Development Guide

This guide explains how to develop R3F locally using unbuild.

## Quick Start

```bash
# Install dependencies (automatically runs yarn stub)
yarn install

# Start developing
yarn dev
```

## Build System Overview

R3F uses **unbuild** for building, which replaced preconstruct. Key differences:

| Feature         | preconstruct         | unbuild                    |
| --------------- | -------------------- | -------------------------- |
| Dev mode        | `preconstruct dev`   | `unbuild --stub`           |
| Build           | `preconstruct build` | `unbuild`                  |
| Shared chunks   | Yes (problematic)    | No (standalone bundles)    |
| Per-entry alias | Not supported        | Supported via rollup hooks |

## Commands

### Development

```bash
# Generate development stubs (like preconstruct dev)
yarn stub

# Alias for stub
yarn dev

# Run examples
yarn examples
```

### Building

```bash
# Build all entry points
yarn build

# Verify bundles are correct
yarn verify-bundles

# Full build + verify
yarn build && yarn verify-bundles
```

### Testing

```bash
# Run all tests
yarn test

# Run specific test file
yarn test packages/fiber/tests/bundles.test.ts

# Watch mode
yarn test:watch
```

## How Development Mode Works

### Stubs vs Built Files

When you run `yarn stub`, unbuild creates **stub files** in `dist/` that redirect to source:

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

### When to Rebuild

You need to run `yarn build` when:

- Preparing for release/publish
- Testing actual bundle output
- Verifying THREE.js import resolution

You do NOT need to rebuild for:

- Normal development
- Testing source code changes
- Running Jest tests

## Project Structure

```
packages/fiber/
├── src/
│   ├── index.tsx           # Default entry point
│   ├── legacy.tsx          # Legacy entry point
│   ├── webgpu/
│   │   └── index.tsx       # WebGPU entry point
│   ├── three/
│   │   ├── index.ts        # Default THREE exports (both)
│   │   ├── legacy.ts       # Legacy THREE exports (WebGL only)
│   │   ├── webgpu.ts       # WebGPU THREE exports (WebGPU only)
│   │   └── tsl.ts          # TSL re-exports
│   └── core/               # Core R3F implementation
├── dist/                   # Built/stub output
│   ├── index.mjs           # Default bundle
│   ├── index.cjs
│   ├── legacy.mjs          # Legacy bundle
│   ├── legacy.cjs
│   └── webgpu/
│       ├── index.mjs       # WebGPU bundle
│       └── index.cjs
├── build.config.ts         # Unbuild configuration
└── package.json
```

## The #three Alias System

Internal code imports from `#three` alias:

```typescript
// In core code
import { WebGLRenderer, WebGPURenderer } from '#three'
```

### How Alias Resolution Works

**During development (Jest/babel):**

- `#three` → `src/three/index.ts` (default, both renderers)

**During build (unbuild/rollup):**

- Default entry: `#three` → `src/three/index.ts`
- Legacy entry: `#three` → `src/three/legacy.ts`
- WebGPU entry: `#three` → `src/three/webgpu.ts`

This is configured in `build.config.ts`:

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

## Troubleshooting

### Changes not reflected

```bash
# Regenerate stubs
yarn stub
```

### TypeScript errors on imports

Make sure stubs exist:

```bash
yarn stub
```

### "Module not found" errors

Check that `package.json` exports are correct:

```json
{
  "exports": {
    ".": {
      "types": "./src/index.tsx",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

### Build fails

1. Check for TypeScript errors: `yarn typecheck`
2. Check for lint errors: `yarn eslint`
3. Review build output for specific errors

## CI/CD

For CI pipelines:

```yaml
steps:
  - run: yarn install
  - run: yarn build
  - run: yarn verify-bundles
  - run: yarn test
```

## Release Process

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
