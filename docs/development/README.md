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

## Where design rationale lives

There is no separate pile of design docs. The _why_ sits with the thing it explains:

- **Frame loop** — why one global scheduler, why named dependencies instead of priority numbers,
  why throttled jobs never catch up: [frame-loop docs](https://docs.pmnd.rs/react-three-fiber/frame-loop).
- **WebGPU / TSL** — why `outputNode` is explicit, why `useRenderPipeline` skips HMR:
  [render-pipeline](https://docs.pmnd.rs/react-three-fiber/webgpu/render-pipeline) and
  [hmr](https://docs.pmnd.rs/react-three-fiber/webgpu/hmr).
- **Entry points and the `#three` alias** — [BUILD.md](./BUILD.md).

This is deliberate. A planning doc that outlives its decision becomes misinformation, and a
rationale doc kept off to the side gets read after the thing it describes has already changed.
If a decision is worth recording, record it where someone will hit it — in the docs for the
feature, or in a comment on the code that implements it.

Superseded planning material is archived in Notion, not in this repo.
