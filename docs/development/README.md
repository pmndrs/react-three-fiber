# Development

This folder contains guides for developing and contributing to `@react-three/fiber`.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/pmndrs/react-three-fiber.git
cd react-three-fiber

# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Launch examples
pnpm examples
```

## Where to Go Next

- **[Contributing](./CONTRIBUTING.md)** — Standards, conventions, and what we expect from pull requests.
- **[Development Guide](./DEVELOPMENT.md)** — Workflow, project structure, and technical documentation index.
- **[Build](./BUILD.md)** — Entry points, the `#three` alias, and how the bundles are produced.
- **[Testing](./TESTING.md)** — Test layout, the WebGPU mocks, and what runs in CI.
- **[Native migration](./NATIVE-MIGRATION.md)** — The `@react-three/fiber/native` → `@react-three/native` split.

## Design Notes

Contributor-facing rationale — _why_ a subsystem is shaped the way it is. These are not usage
docs; user-facing content lives under [`docs/`](../) and at https://docs.pmnd.rs/react-three-fiber.

- **[Frame loop & scheduler](./frame-loop-design.md)** — the global singleton, phase-graph ordering, render takeover, fps throttling.
- **[WebGPU / TSL](./webgpu-tsl-design.md)** — `useRenderPipeline` intent, `outputNode`, and the deliberate HMR behavior.

## Historical

Superseded planning material, kept for provenance and clearly marked non-canonical. Decisions
here have been made — and some were made differently. Never cite these as current behavior.

- **[WebGPU upgrade outline](./webgpu-outline.md)** — the original v10 WebGPU planning outline (Dec 2025).
