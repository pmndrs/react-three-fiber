# Contributing

Thank you for your interest in contributing to `@react-three/fiber`. This document covers the standards and conventions we follow.

## Commit Conventions

We use [Conventional Commits](https://conventionalcommits.org) for automated releases:

- `feat:` — New features
- `fix:` — Bug fixes
- `chore:` — Maintenance tasks
- `docs:` — Documentation updates

## Versioning

All packages follow [Semantic Versioning (SemVer)](https://semver.org).

## Changesets

Every code change requires a changeset. This powers our automated release process.

```bash
pnpm changeset:add
```

You'll be prompted to select affected packages, bump type (major/minor/patch), and write a summary.

## What Reviewers Look For

- **Tests** — All changes should include appropriate test coverage
- **Types** — TypeScript definitions must be accurate and complete
- **Docs** — Update documentation if behavior changes
- **Scope** — Keep PRs focused; split large changes into smaller PRs

## Ready to Code?

See the **[Development Guide](./DEVELOPMENT.md)** for workflow, project structure, and links to technical docs.
