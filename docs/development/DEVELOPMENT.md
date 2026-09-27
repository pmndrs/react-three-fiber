# Development Guide

This is the hub for all technical documentation. It covers day-to-day workflow, project structure, and links to specialized guides.

## v10 Context

v10 introduces significant architectural changes:

- **WebGPU Support** — `<Canvas renderer>` on `@react-three/fiber`, with `/webgpu` and `/legacy` entries for one renderer only
- **Native Split** — React Native support moved to separate `@react-three/native` package
- **New Build System** — Unbuild, one build with a shared core; renderer supports loaded on demand
- **Modern Tooling** — pnpm workspaces and Vitest for testing

These changes mean an app downloads only the renderer its Canvas asks for, and libraries built on fiber add no renderer at all.

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
│   └── support/            # webgl.ts / webgpu.ts: the only modules that import three
├── types/                  # Internal TypeScript definitions
├── tests/                  # Vitest tests
└── build.config.ts         # Build entry point configuration
```

- **Shared Logic** — Most changes happen in `src/core/`
- **Three imports** — Core never imports a three value; it reads classes from the renderer support a root loaded (see [BUILD](./BUILD.md))

---

## Adding Features

//\* All Entry Points ------------------------------------

1. Add logic in `src/core/`
2. Export from `src/core/index.tsx`
3. Automatically available in all bundles

//\* WebGPU-Specific -------------------------------------

1. Add code to `src/webgpu/`
2. Export from `src/webgpu/index.tsx`
3. Only exported from `@react-three/fiber/webgpu`

//\* New THREE.js Imports --------------------------------

1. In `src/core/`, `import type` only. Read a shared-core class from `getThree()`, a renderer-specific one from `state.internal.support`
2. A renderer-specific class core does not have yet goes on the support (`types/provider.d.ts`, `src/support/webgl.ts`, `src/support/webgpu.ts`)
3. A three addon is loaded where it is used, with a dynamic import

---

## Documentation Index

| Guide                                         | Purpose                                                           |
| :-------------------------------------------- | :---------------------------------------------------------------- |
| **[BUILD](./BUILD.md)**                       | Build system architecture, renderer supports, adding entry points |
| **[TESTING](./TESTING.md)**                   | Testing strategy, bundle verification, troubleshooting            |
| **[NATIVE-MIGRATION](./NATIVE-MIGRATION.md)** | v10 native package split details                                  |

Design rationale is not kept as separate documents — it lives with the feature it explains. See
[README](./README.md#where-design-rationale-lives).
