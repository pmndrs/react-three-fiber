# Migration from Preconstruct to Unbuild

This document explains why and how `@react-three/fiber` migrated from [preconstruct](https://preconstruct.tools/) to [unbuild](https://github.com/unjs/unbuild).

## Why We Migrated

### The Core Problem: Per-Entry Alias Resolution

R3F needs to produce three bundles (default, legacy, webgpu) from the same source code, but with different Three.js imports. The codebase uses:

```ts
import * as THREE from '#three'
```

This alias must resolve differently per bundle:

- **Default**: `three` (both renderers)
- **Legacy**: `three` (WebGL only exports)
- **WebGPU**: `three/webgpu` (WebGPU only exports)

**Preconstruct couldn't do this.** It used a single global configuration derived from `package.json` — there was no way to say "when building the legacy entry, resolve `#three` to X, but when building webgpu, resolve it to Y."

### Subpath Export Workarounds

Before the `exports` field in `package.json` was widely supported, preconstruct required creating physical folders with stub `package.json` files for each subpath export:

```
packages/fiber/
├── legacy/
│   └── package.json  # Points to dist/react-three-fiber-legacy.cjs.js
├── webgpu/
│   └── package.json  # Points to dist/react-three-fiber-webgpu.cjs.js
```

This was necessary so that `import { ... } from '@react-three/fiber/legacy'` would work by Node's package resolution finding `legacy/package.json`.

With unbuild and modern Node.js, the `exports` field handles this natively:

```json
{
  "exports": {
    "./legacy": {
      "import": "./dist/legacy.mjs",
      "require": "./dist/legacy.cjs"
    }
  }
}
```

## Key Differences

| Aspect                  | Preconstruct                   | Unbuild                     |
| ----------------------- | ------------------------------ | --------------------------- |
| Configuration           | Reads from `package.json`      | Explicit `build.config.ts`  |
| Subpath exports         | Required stub folders          | Native `exports` field      |
| Per-entry customization | Not possible                   | Full support via hooks      |
| Transpiler              | Babel                          | ESBuild (faster)            |
| Bundler                 | Rollup                         | Rollup                      |
| Output naming           | Fixed pattern: `{name}.cjs.js` | Configurable: `{entry}.mjs` |

## Migration Steps

### 1. Install unbuild

```bash
yarn add -D unbuild @rollup/plugin-alias
```

### 2. Create `build.config.ts`

```ts
import { defineBuildConfig } from 'unbuild'
import alias from '@rollup/plugin-alias'

export default defineBuildConfig([
  {
    name: 'default',
    entries: ['src/index.tsx'],
    outDir: 'dist',
    hooks: {
      'rollup:options': (_ctx, options) => {
        // Add per-entry alias plugin
        options.plugins = [createAliasPlugin('default'), ...options.plugins]
      },
    },
  },
  // ... more entries
])
```

### 3. Update `package.json`

**Before (preconstruct):**

```json
{
  "main": "dist/react-three-fiber.cjs.js",
  "module": "dist/react-three-fiber.esm.js",
  "preconstruct": {
    "entrypoints": [".", "legacy", "webgpu"]
  }
}
```

**After (unbuild):**

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./legacy": {
      "import": "./dist/legacy.mjs",
      "require": "./dist/legacy.cjs"
    }
  },
  "scripts": {
    "build": "unbuild"
  }
}
```

### 4. Remove Stub Folders

Delete the legacy `legacy/` and `webgpu/` folders that contained stub `package.json` files. They're no longer needed.

### 5. Remove preconstruct Config

Remove any `preconstruct` field from `package.json` and uninstall the package.

## Benefits After Migration

1. **Correct bundle separation**: Each bundle properly externalizes only its relevant Three.js imports
2. **Faster builds**: ESBuild transpilation is significantly faster than Babel
3. **Cleaner project structure**: No stub folders cluttering the package
4. **Modern standards**: Uses native `exports` field, better tooling support
5. **Full customization**: Can add any Rollup plugin or configuration per entry
