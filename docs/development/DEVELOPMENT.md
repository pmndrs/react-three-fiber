# Development Workflow Guide

This guide covers the day-to-day process of developing `@react-three/fiber` locally. For technical details on our build architecture or testing infrastructure, please refer to the specialized guides.

## 🛠️ Development Cycle

The general loop when working on a feature or fix:

1.  **Start Dev Mode**: `pnpm dev` (Generates stubs to link source to dist).
2.  **Make Changes**: Edit files in `packages/fiber/src/`.
3.  **Test**: Run tests with `pnpm test`.
4.  **Verify UI**: Use the examples with `pnpm examples`.
5.  **Clean up**: Ensure snapshots and lint pass.

### 🏃 Common Commands

| Command         | Purpose                                          |
| :-------------- | :----------------------------------------------- |
| `pnpm dev`      | Starts development mode (alias for `pnpm stub`). |
| `pnpm examples` | Launches the local example suite for UI testing. |
| `pnpm test`     | Runs the full Vitest suite.                      |
| `pnpm build`    | Generates final production bundles.              |

---

## 📂 Project Structure

Understanding where code lives:

```text
packages/fiber/
├── src/
│   ├── index.tsx           # Default entry (WebGL + WebGPU)
│   ├── legacy.tsx          # Legacy entry (WebGL only)
│   ├── webgpu/             # WebGPU-specific entry/logic
│   ├── core/               # Core reconciler and hooks (Shared)
│   └── three/              # THREE.js alias resolution files
├── types/                  # Internal TypeScript definitions
├── tests/                  # All Vitest tests
└── build.config.ts         # Build entry point configuration
```

- **Shared Logic**: Most changes should happen in `src/core/`.
- **Three.js Aliases**: We use `#three` to dynamically switch between Three.js variants. See **[BUILD](./BUILD.md)** for how this works.

---

## ✨ Adding New Features

### 1. Adding to All Entry Points

1.  Add your logic in `src/core/`.
2.  Export it from `src/core/index.tsx`.
3.  It will be automatically available in all bundles.

### 2. WebGPU-Specific Features

1.  Add code to `src/webgpu/`.
2.  Export from `src/webgpu/index.tsx`.
3.  These features will _only_ be included in the `@react-three/fiber/webgpu` entry.

### 3. Adding New THREE.js Imports

If you need a new export from the Three.js ecosystem:

1.  Update the relevant variant in `src/three/` (e.g., `index.ts`, `legacy.ts`, or `webgpu.ts`).
2.  Import from `#three` in your core code.

---

## 🧪 Testing Your Changes

We use **Vitest** for all logic testing.

- **Run tests**: `pnpm test`
- **Watch mode**: `pnpm test:watch`
- **Focus a file**: `pnpm vitest path/to/file.test.ts`

For a deep dive into our testing strategy, including bundle size verification, see the **[Testing Guide](./TESTING.md)**.

---

## 🔍 Troubleshooting

- **Changes not showing?**: Run `pnpm stub` to ensure your `dist` folders point to `src`.
- **Import errors in IDE?**: Restart your TypeScript server or run `pnpm typecheck`.
- **"EPERM" errors on Windows?**: Ensure [Developer Mode](https://howtogeek.com/292914/what-is-developer-mode-in-windows-10) is enabled for symlink support.

---

## 🚀 Ready to Release?

Once your changes are verified:

1.  **Create a changeset**: `pnpm changeset:add`
2.  **Follow the release guide**: **[Alpha Release Guide](./ALPHA-RELEASE.md)**
