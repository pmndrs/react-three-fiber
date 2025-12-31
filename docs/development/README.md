# Documentation

This directory contains technical documentation for `@react-three/fiber` development.

## For Contributors

- **[CONTRIBUTING](../CONTRIBUTING.md)** - Start here! How to contribute, setup, and release process
- **[BUILD](./BUILD.md)** - Build system, package manager, and tooling decisions
- **[DEVELOPMENT](./DEVELOPMENT.md)** - Day-to-day development workflows and commands

## Quick Navigation

### Getting Started

1. Read [CONTRIBUTING](../CONTRIBUTING.md) for setup instructions
2. Install dependencies: `yarn install`
3. Start developing: `yarn dev`
4. See [DEVELOPMENT](./DEVELOPMENT.md) for detailed workflows

### Understanding Our Tooling

- **Why Yarn 4?** See [BUILD: Package Manager](./BUILD.md#package-manager-yarn-4)
- **Why Unbuild?** See [BUILD: Build System](./BUILD.md#build-system-unbuild)
- **Migration History** See [BUILD: Migration History](./BUILD.md#migration-history)

### Common Tasks

- **Running tests:** `yarn test`
- **Building:** `yarn build`
- **Running examples:** `yarn examples`
- **Creating a release:** See [CONTRIBUTING: Publishing](../CONTRIBUTING.md#publishing)

## Architecture

- **Monorepo Structure:** Yarn workspaces with multiple packages
- **Build Tool:** Unbuild with per-entry alias resolution
- **Package Manager:** Yarn 4 (Berry) with `nodeLinker: node-modules`
- **Test Framework:** Jest with React Testing Library
- **Type System:** TypeScript with source-based types

## Need Help?

- Check [DEVELOPMENT](./DEVELOPMENT.md) for troubleshooting
- See [BUILD](./BUILD.md) for tooling questions
- Open a discussion on [GitHub Discussions](https://github.com/pmndrs/react-three-fiber/discussions)
