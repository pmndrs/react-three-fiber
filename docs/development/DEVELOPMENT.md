# Development Guide

This is the hub for all technical documentation. It covers day-to-day workflow, project structure, and links to specialized guides.

## v10 Context

v10 introduces significant architectural changes:

- **WebGPU Support** — New `@react-three/fiber/webgpu` entry point alongside the default and legacy builds
- **Native Split** — React Native support moved to separate `@react-three/native` package
- **New Build System** — Unbuild with per-entry alias resolution for THREE.js imports
- **Modern Tooling** — pnpm workspaces and Vitest for testing

These changes enable tree-shaking between WebGL and WebGPU code paths and cleaner dependency management.

---

## Development Workflow

//\* Development Cycle ===================================

```bash
pnpm dev        # Generate stubs linking src → dist
pnpm examples   # Launch example suite for UI testing
pnpm test       # Run Vitest suite
pnpm build      # Generate production bundles
```

The general loop:

1. `pnpm dev` — Start development mode
2. Edit files in `packages/fiber/src/`
3. `pnpm test` — Verify changes
4. `pnpm examples` — Visual verification

---

## Project Structure

```text
packages/fiber/
├── src/
│   ├── index.tsx           # Default entry (WebGL + WebGPU)
│   ├── legacy.tsx          # Legacy entry (WebGL only)
│   ├── webgpu/             # WebGPU-specific entry/logic
│   ├── core/               # Core reconciler and hooks (shared)
│   └── three/              # THREE.js alias resolution files
├── types/                  # Internal TypeScript definitions
├── tests/                  # Vitest tests
└── build.config.ts         # Build entry point configuration
```

- **Shared Logic** — Most changes happen in `src/core/`
- **THREE.js Aliases** — We use `#three` to dynamically switch between THREE.js variants (see [BUILD](./BUILD.md))

---

## Adding Features

//\* All Entry Points ------------------------------------

1. Add logic in `src/core/`
2. Export from `src/core/index.tsx`
3. Automatically available in all bundles

//\* WebGPU-Specific -------------------------------------

1. Add code to `src/webgpu/`
2. Export from `src/webgpu/index.tsx`
3. Only included in `@react-three/fiber/webgpu`

//\* New THREE.js Imports --------------------------------

1. Update the relevant variant in `src/three/` (`index.ts`, `legacy.ts`, or `webgpu.ts`)
2. Import from `#three` in your core code

---

## Documentation Index

| Guide                                         | Purpose                                                          |
| :-------------------------------------------- | :--------------------------------------------------------------- |
| **[BUILD](./BUILD.md)**                       | Build system architecture, alias resolution, adding entry points |
| **[TESTING](./TESTING.md)**                   | Testing strategy, bundle verification, troubleshooting           |
| **[ALPHA-RELEASE](./ALPHA-RELEASE.md)**       | Alpha release process for v10 branch                             |
| **[NATIVE-MIGRATION](./NATIVE-MIGRATION.md)** | v10 native package split details                                 |
