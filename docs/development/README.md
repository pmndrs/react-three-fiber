# Development Documentation

Welcome to the `@react-three/fiber` development guide. This directory contains everything you need to know about contributing to, building, and testing the library.

## 🚀 Quick Start

If you just want to get up and running:

1.  **Install dependencies**: `pnpm install`
2.  **Start development mode**: `pnpm dev`
3.  **Run examples**: `pnpm examples`

---

## 📖 Documentation Guides

### Core Guides

- **[CONTRIBUTING](./CONTRIBUTING.md)**: Rules for contributing, setup instructions, and release process overview.
- **[DEVELOPMENT](./DEVELOPMENT.md)**: Your day-to-day workflow, project structure, and how to add features.

### Specialized Technical Docs

- **[BUILD](./BUILD.md)**: Deep dive into our build system (Unbuild), package manager (pnpm), and entry point architecture.
- **[TESTING](./TESTING.md)**: Detailed information on Vitest, bundle verification, and troubleshooting tests.
- **[ALPHA-RELEASE](./ALPHA-RELEASE.md)**: Step-by-step guide for creating and publishing alpha releases.

---

## 🏗️ Architecture at a Glance

- **Monorepo**: Powered by [pnpm workspaces](https://pnpm.io/workspaces).
- **Build System**: [Unbuild](https://github.com/unjs/unbuild) for stub-based development and per-entry-point optimization.
- **Test Runner**: [Vitest](https://vitest.dev/) for fast, native ESM testing in JSDOM.
- **Transpilation**: Native ESM with TypeScript.

---

## Need Help?

- Check the **Troubleshooting** section in [DEVELOPMENT](./DEVELOPMENT.md#troubleshooting).
- See [BUILD](./BUILD.md) for architecture-specific questions.
- Open a discussion on [GitHub Discussions](https://github.com/pmndrs/react-three-fiber/discussions).
