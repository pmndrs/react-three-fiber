---
title: 'v10 Beta Checklist'
description: Tracking work between the current alpha and the v10 beta cut. Internal — not a user-facing migration doc.
nav: 99
---

# v10 Beta Checklist

> **Purpose:** consolidate everything still outstanding for the v10 beta cut.
> Sources reconciled here: `CHANGELOG-ALPHA.md` (Unreleased), `docs/v10-features.md`,
> `docs/v10-migration.md`, open GitHub issues tagged `v10`, and open PRs against
> `master` / `v10`. Update as items land or get reclassified.

## Current State

- Published version: `@react-three/fiber@10.0.0-alpha.2` (`packages/fiber/package.json`).
- Branch `v10` and `claude/investigate-branch-relationship-gNdNw` are at the same
  commit (`1b98c17`).
- Branch `feat/v10-stable-uniforms` is `1b98c17 + 1` commit
  (`4119f5e — Add stable uniforms for ShaderMaterial to v10`, PR #3739) — not an
  artifact, real follow-up work waiting for review.
- `CHANGELOG-ALPHA.md` "Unreleased" section is the de-facto draft for an
  `alpha.3` cut and contains roughly 12 feature blocks + bug fixes already
  landed since `alpha.2`.

---

## Pre-Beta Sequence (proposed order of operations)

1. **Cut `alpha.3`** from `CHANGELOG-ALPHA.md` "Unreleased" as-is. This ships
   the work already on `v10` to users without further blocking.
2. **Land PR #3739** (`feat/v10-stable-uniforms`) — catches v10 up to v9 on
   ShaderMaterial uniforms. Either fold into `alpha.3` or ship as `alpha.4`.
3. **Doc + test gap pass** (sections below) — close anything we don't want to
   carry into a beta.
4. **Triage open `master`-targeted PRs** (#3747, #3748, #3746, #3711, #3698,
   #3714) — decide which port to `v10`.
5. **Cut `beta.0`**, fold `CHANGELOG-ALPHA.md` into the package `CHANGELOG.md`
   per the note at the top of the alpha file, and remove the alpha file.

---

## Open v10-Labeled GitHub Issues

| #     | Title                                  | Status / Decision Needed                                                                |
| ----- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| 3642  | Update Awesome R3F Page                | Docs / admin. Decide: in-tree page vs separate repo. **Beta-blocker?** Probably no.     |
| 3634  | Enhanced LoadingManager                | Author has explicitly deferred to **v10.1**. Move out of beta scope.                    |
| 3616  | [v10.1] Loading Manifest Handling      | Title self-defers to **v10.1**. Move out of beta scope.                                 |
| 3415  | docs: Cookbook page                    | Docs. Nice-to-have, not a beta blocker. Could be in `docs/cookbook.mdx`.                |
| 2701  | RFC: eslint-plugin rules               | `no-clone-in-frame-loop` shipped. `prefer-useloader` in PR #3698. `no-fast-state` open. |

> No open issues are tagged "blocker"; none of the above gate a beta cut on
> their own. Recommend explicitly punting #3634 + #3616 to v10.1 and shipping
> beta without them.

---

## Open Pull Requests

### Targeting `v10` directly

| PR    | Title                                          | Action                                                          |
| ----- | ---------------------------------------------- | --------------------------------------------------------------- |
| 3739  | [v10] Add stable uniforms for ShaderMaterial   | **Review + merge before beta.** Requested reviewer: DennisSmolek. |
| 3694  | chore(docs): add games to AwesomeR3F           | Docs only. Merge or punt.                                       |

### Targeting `master` — need triage / port to `v10`

| PR    | Title                                                | Triage                                                                                                          |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 3748  | Default shadow map type → `PCFShadowMap`             | **Already landed in `v10` Unreleased** per `CHANGELOG-ALPHA.md`. Confirm parity, then close this PR or merge to master. |
| 3747  | Fix memory leak in `loop.ts` (state/subscribers refs)| **Strong beta candidate.** Verify against rewritten v10 scheduler — `loop.ts` may not exist in same form. Port if applicable. |
| 3746  | docs: use `three/addons` loader paths in hooks.mdx   | Trivial docs fix. Port to `v10`.                                                                                |
| 3711  | feat(useLoader): support custom cache keys           | Tied to issue #3634/#3149. If we punt LoadingManager work to v10.1, hold this PR too — or land just the cacheKey API. |
| 3698  | feat(eslint-plugin): `prefer-useloader` rule         | Partial close of #2701. Independent. Merge whenever — not a beta blocker.                                       |
| 3714  | docs: community components grid                      | Docs only. Port to v10 when convenient.                                                                         |

---

## Feature → Doc Coverage Gap

Features that landed in the alpha but **don't appear in `docs/v10-features.md`**.
Decide for each: add a section, link the co-located readme, or accept as
power-user-only.

- [ ] **`interactivePriority`** (events.ts) — `userData.interactivePriority` for
      hit sort priority. Currently only documented in `CHANGELOG-ALPHA.md`.
- [ ] **`useBuffers` / `useGPUStorage`** — has co-located doc at
      `packages/fiber/src/webgpu/hooks/readmes/useBuffers-useGPUStorage.md`,
      but no entry in the main features doc or in the WebGPU hooks list in
      `v10-migration.md` (which lists `useUniforms`, `useNodes`, `useLocalNodes`,
      `useRenderPipeline` only).
- [ ] **`forceEven` Canvas prop** — Safari fix. Not in features doc.
- [ ] **`ScopedStore` / `createScopedStore`** — type-safe uniform/node access
      mentioned briefly under HMR but not as a standalone section.
- [ ] **Default shadow type change** (`PCFSoftShadowMap` → `PCFShadowMap`) — a
      breaking-ish behavior change; belongs in `v10-migration.md` "Breaking
      Changes" or "Removed Props" sibling.
- [ ] **Removed renderer props** (`legacy`/`linear`/`flat`/`colorSpace`/
      `toneMapping`) — present in `v10-migration.md` already; verify that the
      pre-existing list in "Removed Props" matches the Unreleased section
      (looks consistent, but worth a final pass).

## Feature → Test Coverage Gap

Spot-check of `packages/fiber/tests/`. Things that landed without an obvious
dedicated test file:

- [ ] `interactivePriority` sorting in events — extend `events.test.tsx`.
- [ ] `forceEven` rounding behavior — extend `canvas.test.tsx`.
- [ ] `Canvas` `background` prop variants (color, hex number, URL, preset,
      object form) — no dedicated test file found.
- [ ] Multi-canvas / `primaryCanvas` / scheduler `after` + `fps` —
      `canvas.test.tsx` and `useFrame.test.tsx` exist but no clear coverage of
      the cross-canvas scheduler path.
- [ ] `useBuffers`, `useGPUStorage`, `useRenderPipeline` — no `webgpu/`
      tests beyond `tests/webgpu/index.test.tsx`. Likely fine for alpha; revisit
      for beta confidence.
- [ ] HMR rebuild paths (`rebuildNodes`, `rebuildUniforms`, `_hmrVersion`) —
      exercised manually only.
- [ ] `Portal` component (camera-attached children) — present in
      `example/src/demos/default/NestedCamera.tsx` as a demo but no unit test.

Existing dedicated tests we should NOT regress: `fromRef.test.tsx`,
`once.test.tsx`, `visibility.test.tsx`, `external-renderer.test.tsx`,
`useFrame.test.tsx`, `useLoader.test.tsx`.

---

## Migration Doc Polish

Pulled from a read of `docs/v10-migration.md`:

- [ ] Replace "Alpha Release" callout with "Beta Release" + updated install
      snippet (`@react-three/fiber@beta` already appears in `readme.md` and
      `packages/fiber/readme.md` — verify post-cut).
- [ ] Add a **Removed default-export shadow type** note alongside the existing
      "Removed Props" section.
- [ ] Add `interactivePriority` and `Portal` to "What's New" so they're
      discoverable from the migration entry point.
- [ ] Confirm the WebGPU hooks list in "What's New › WebGPU & TSL Hooks"
      includes `useBuffers`, `useGPUStorage`, and ScopedStore (currently lists
      `useUniforms`, `useNodes`, `useLocalNodes`, `useRenderPipeline`).
- [ ] Verify the link target `../packages/fiber/src/webgpu/hooks/readmes/overview.md`
      resolves on the published docs site (relative path may break depending on
      docs build).

---

## Deferred to v10.1 (out of beta scope)

Tracked here so they aren't re-litigated during the beta cut:

- LoadingManager overhaul (#3634)
- Loading Manifest Handling (#3616)
- Custom `useLoader` cache keys (#3711) — unless landed standalone
- Awesome R3F page restructure (#3642) — unless we just edit the existing one

---

## Open Questions

- Do we ship `feat/v10-stable-uniforms` (#3739) as part of `alpha.3` or as
  `alpha.4`?
- Is the `loop.ts` memory leak (#3747) reproducible against the v10 scheduler,
  or does the rewrite already address it? Needs a 30-minute investigation.
- Are there v10 issues we're missing because they live in `pmndrs/drei` or
  `pmndrs/postprocessing` rather than this repo?
- Should `CHANGELOG-ALPHA.md` be folded into `packages/fiber/CHANGELOG.md` at
  beta cut, per its own preamble note, or kept as a historical document?
