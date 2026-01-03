# Contributing to `@react-three/fiber`

Thank you for your interest in contributing! This document outlines the standards and initial setup required to work on the project.

## 📜 Standards & Conventions

### Semantic Commits

This project follows [Conventional Commits](https://conventionalcommits.org). This is required for our automated release process.

- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for maintenance
- `docs:` for documentation updates

### Versioning

We use [Semantic Versioning (SemVer)](https://semver.org) for all packages.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v22 or higher
- **pnpm**: v9 or higher (Required for workspace management)

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pmndrs/react-three-fiber.git
   cd react-three-fiber
   ```
2. **Install dependencies**:
   ```bash
   pnpm install
   ```
   > **Note**: This automatically generates development stubs. See [BUILD](./BUILD.md) for details.

---

## 💻 Development Workflow

For a detailed guide on how to make changes, add features, and use the development environment, see the **[Development Guide](./DEVELOPMENT.md)**.

### Quick Commands

- **Run examples**: `pnpm examples`
- **Run tests**: `pnpm test`
- **Create a changeset**: `pnpm changeset:add` (Required for all code changes)

---

## 🧪 Testing Requirements

All contributions must include appropriate tests. We use **Vitest** for unit and integration testing.

- **Detailed testing guide**: **[Testing Guide](./TESTING.md)**
- **Update snapshots**: `pnpm vitest -u`

---

## 🚀 Release Process

We use [Changesets](https://github.com/atlassian/changesets) for versioning and publishing.

- For stable releases, see the `Publishing` section in the core documentation.
- For alpha releases (v10), follow the **[Alpha Release Guide](./ALPHA-RELEASE.md)**.

---

## Need Help?

If you're unsure about anything, please open a [GitHub Discussion](https://github.com/pmndrs/react-three-fiber/discussions) or join our Discord.
