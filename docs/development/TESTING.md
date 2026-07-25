# Testing Guide

This is the **canonical** testing guide for `@react-three/fiber`. It is the single source of truth for how we test — for both human contributors and coding agents. If you are adding a test, fixing CI, or planning coverage work, start here.

---

## TL;DR

```bash
pnpm test            # Tier 1: unit + mock suite with coverage (what CI runs)
pnpm test:watch      # Tier 1: watch mode, no coverage
pnpm run ci          # Full local gate: build → verify → typecheck → eslint → test → format
```

- **Tier 1 (this repo's everyday suite)** runs in jsdom on every PR. Pure-JS logic + hook lifecycle against mocks.
- **Tier 2 (browser/GPU)** proves real-WebGPU behavior. It runs on a machine with a GPU as a **pre-release gate**, not on every PR. _(Strategy documented below; harness not yet built.)_
- **Tier 3 (headless WebGPU in CI)** is an open spike that could pull part of Tier 2 into per-PR CI.

If you only remember one rule: **a green `pnpm test` does not prove the WebGPU runtime works** — that's what Tier 2 is for.

---

## The three-tier model

R3F spans pure JS, React reconciliation, and a GPU runtime that jsdom cannot execute. One test runner can't cover all of that, so we split by _what each tier can actually prove_.

| Tier                    | Command                     | Runs where              | Proves                                                                                                                                                        | Gate                     |
| :---------------------- | :-------------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------- |
| **1 — Unit + mock**     | `pnpm test`                 | CI, every PR (jsdom)    | Pure-JS logic, React behavior, hook create/update/dispose/rebuild against the `WebGPUContext` mock, export parity                                             | **Per-PR (blocking)**    |
| **2 — Browser / GPU**   | `pnpm test:gpu` _(planned)_ | Local GPU box / display | Real WebGPU: device init, first frame, node-material auto-extend, render-pipeline delegation, occlusion, TSL HMR, multi-canvas shared renderer + shared state | **Pre-release (manual)** |
| **3 — Headless WebGPU** | spike                       | CI, _if feasible_       | A subset of Tier 2 without a physical GPU (SwiftShader/Dawn)                                                                                                  | Investigation            |

**The honest CI gap:** between tiers, per-PR CI guards only the mock + pure-JS layer. Real-GPU regressions are caught at the Tier-2 pre-release gate, not on the PR that introduces them. For the stable WebGPU surface (multi-canvas, `useRenderPipeline`, `onOccluded`) this is an accepted limitation — Tier 3 exists to narrow it.

**Design principle — push work down a tier.** The cheapest, most reliable test is a Tier-1 test. Before writing a Tier-2 browser check, ask: _can this run against the `WebGPUContext` mock instead?_ Lifecycle, wiring, store resolution, and rebuild logic usually can. Only genuinely GPU-dependent behavior (does it actually render? is the depth correct?) belongs in Tier 2.

---

## Tier 1 — Unit + mock (Vitest)

This is the suite you run constantly and the one CI blocks on. It runs against **source files** (not `dist`) via the aliases in [`vitest.config.ts`](../../vitest.config.ts), in a jsdom environment, with v8 coverage.

```bash
pnpm test                                         # full run + coverage (CI parity)
pnpm test:watch                                   # watch mode, no coverage
pnpm vitest packages/fiber/tests/events.test.tsx  # single file
pnpm vitest -t "interactivePriority"              # by test name
```

### What Tier 1 covers

- **Pure-JS logic** — the multi-canvas `canvasRegistry`, the `renderer` config-bag parser, `ScopedStore` Proxy semantics, prop diffing, background parsing.

> **The frame scheduler is an external dependency** (`@pmndrs/scheduler`) as of alpha.3 — its internals (phase graph, topo sort, fps rate limiter) are unit-tested **upstream**, not here. This repo tests the **integration**: that `useFrame` drives the scheduler correctly (phase ordering, render-phase takeover, fps throttling end-to-end, pause/resume). Don't re-test scheduler internals in R3F.

- **React behavior** — reconciliation, hooks (`useFrame`, `useThree`, `useLoader`, …), event handling and raycasting, store updates.
- **Export parity** — each entry point (`default` / `legacy` / `webgpu`) exports the right symbols (`tests/{default,legacy,webgpu}/index.test.tsx`).
- **WebGPU hook lifecycle via the mock** — create / update / dispose / rebuild for the TSL hooks, exercised against `WebGPUContext` (see [Mocks](#mocks-and-the-webgpu-context)).

### What Tier 1 _cannot_ cover

Anything that needs a real GPU device: actual rendering, node-material compilation, render-pipeline output, occlusion queries, real TSL HMR. Those are Tier 2. Don't fake a passing assertion for them in jsdom — leave a `it.todo` or a comment pointing at the Tier-2 check.

### Mocks and the WebGPU context

jsdom has no WebGL or WebGPU. We stub them so Tier 1 can run:

- [`packages/fiber/tests/setupTests.ts`](../../packages/fiber/tests/setupTests.ts) — mocks WebGL2, `ResizeObserver`, `PointerEvent`, and suppresses the benign "multiple instances of Three.js" warning.
- [`packages/test-renderer/src/WebGPUContext.ts`](../../packages/test-renderer/src/WebGPUContext.ts) — a mock WebGPU context that lets hook lifecycle tests run without a device.

**The `WebGPUContext` mock is the single biggest lever for CI coverage.** Every behavior we can drive against it is a behavior that moves from "Tier-2 browser-only" into "Tier-1, guarded on every PR." Investing in the mock is preferred over deferring a hook to browser-only validation. Document clearly, in the test, which paths are mock-validated vs which still require Tier 2.

---

## Tier 2 — Browser / GPU validation

**Status: strategy decided, harness not yet built (planned `pnpm test:gpu`).**

WebGPU is a first-class, baseline path in v10 — not an exotic add-on. The stable WebGPU surface ships in 10.0, so it must be validated against a real device before each release. Tier 2 is that gate.

### How it works

Non-headless Playwright (`headless: false`, Chromium with WebGPU enabled) drives the **example app** on a machine with a real GPU + display. It is scripted and repeatable — it replaces ad-hoc "I clicked around and it looked fine" browser checks.

It is **not** a per-PR CI gate (it needs a physical GPU + display). Treat it as a **pre-release gate**: run it during a release pass and before each promotion (alpha → beta → RC → stable).

### What Tier 2 must prove (the checklist)

These are the real-GPU behaviors no jsdom/mock test can reach. Each should become a scripted Playwright check against the example app:

1. **Basic WebGPU render** — `<Canvas renderer>` inits without a manual `renderer.init()`; first frame draws; no depth mismatch.
2. **WebGPU-only entry** — `@react-three/fiber/webgpu` runs with no plain `three` WebGL imports; node materials auto-extend.
3. **Multi-canvas shared renderer** — a primary canvas + a secondary with `renderer={{ primaryCanvas: 'main' }}` share one renderer, switch targets correctly, clean up, honor scheduler `after`/`fps`, **and share state via `primaryStore`**.
4. **Occlusion** — `onOccluded` / `onVisible` fire only on state change; clean up on unmount.
5. **Render pipeline** — `useRenderPipeline` makes the default render delegate to `renderPipeline.render()`.
6. **TSL HMR** — editing a TSL node in Vite rebuilds without a full reload and leaves no stale nodes/uniforms.
7. **Camera parenting** — camera children render and clean up.

### When the harness is built (future)

```bash
pnpm test:gpu        # run the Playwright/WebGPU suite against the example app (planned)
```

Proposed layout: a separate Playwright project (e.g. `e2e/` or `packages/fiber/e2e/`) with `*.gpu.spec.ts` files and its own config — kept **out** of the Vitest `include` glob so it never runs accidentally in jsdom CI. Until then, the checklist above is run manually on a GPU box.

---

## Tier 3 — Headless WebGPU in CI (spike)

An open investigation, not a committed path. WebGPU via **SwiftShader/Dawn** in headless Chromium (`--enable-unsafe-swiftshader`) can run _some_ WebGPU without a physical GPU. If it works for our paths, it promotes part of Tier 2 into per-PR CI coverage for the stable trio.

Time-boxed and exploratory — **do not block any release on it.** If the spike succeeds, document the working subset here and wire it into CI as a separate, non-blocking job first.

---

## Local ↔ CI parity (one source of truth)

The local full gate and the CI workflow **must run the same checks in the same way**, or they drift and "passes locally" stops meaning anything.

- **Local full gate:** `pnpm run ci` → `build → verify-bundles → verify-types → typecheck → eslint → dev → test → format`.
- **CI workflow:** [`.github/workflows/test.yml`](../../.github/workflows/test.yml) — runs on PRs and `master`, across a React version matrix (19.0.0 + latest).

> **Known gap (tracked in the roadmap below):** CI currently does **not** run `verify-bundles` / `verify-types`, so `pnpm run ci` locally is stricter than CI. The fix is to have CI invoke the same script set (ideally `pnpm run ci` directly, or a shared composite step) so the two cannot diverge.

**Rule for new checks:** if you add a verification step, add it to _both_ the `ci` script and the workflow — or, better, add it to the shared script the workflow calls.

---

## Test organization & conventions

### Where tests live

| Location                                        | Contents                                                                          | Naming                 |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- | :--------------------- |
| `packages/fiber/tests/*.test.tsx`               | Core unit + integration tests (events, hooks, renderer, scheduler, visibility, …) | `<area>.test.tsx`      |
| `packages/fiber/tests/{default,legacy,webgpu}/` | Per-entry export-parity tests                                                     | `index.test.tsx`       |
| `packages/fiber/tests/setupTests.ts`            | Global mocks (WebGL2, ResizeObserver, PointerEvent)                               | —                      |
| `packages/test-renderer/src/__tests__/`         | Test-renderer suite                                                               | `RTTR.<area>.test.tsx` |
| `packages/test-renderer/src/WebGPUContext.ts`   | WebGPU mock used for hook lifecycle tests                                         | —                      |
| `e2e/` _(planned)_                              | Tier-2 Playwright/WebGPU checks                                                   | `*.gpu.spec.ts`        |

### Conventions

- **One area per file.** Match the source file/feature you're testing (`events.ts` → `events.test.tsx`).
- **Co-locate WebGPU hook tests** under a `tests/webgpu/` area and drive them against `WebGPUContext`. Note in the file which assertions are mock-validated vs Tier-2-only.
- **Keep Tier-2 out of Vitest.** Browser specs use a distinct extension (`*.gpu.spec.ts`) and live outside the Vitest `include` glob so they can never run (and fail) in jsdom.
- **Label the irreducible.** If a behavior genuinely needs a GPU, leave an `it.todo('covered by Tier 2: <check>')` rather than a hollow jsdom assertion — that keeps the gap visible.
- **Tests run against source**, not `dist`. Bundle/type correctness is verified separately (below).

### How to add a test

- **Pure-JS / React behavior** → add a `*.test.tsx` in `packages/fiber/tests/`, run `pnpm test:watch`.
- **A WebGPU hook's lifecycle** → add a test under `tests/webgpu/` driven by `WebGPUContext`; cover create/update/dispose/rebuild. If a path needs a real device, stop and add it to the Tier-2 checklist instead.
- **A new export** → add/extend the parity test in `tests/{default,legacy,webgpu}/`.
- **A real-GPU behavior** → add it to the [Tier-2 checklist](#what-tier-2-must-prove-the-checklist); script it once the harness exists.

---

## Coverage

Coverage uses the v8 provider; reporters are `text`, `json`, and `html` (configured in [`vitest.config.ts`](../../vitest.config.ts)). Open `coverage/index.html` after `pnpm test` for the line-by-line view.

### Current policy: report, don't block (yet)

We **surface** coverage but do **not** fail builds on it during alpha/beta. A hard floor lands at stable (so new surfaces can't regress silently) — see the roadmap. Until then, treat the targets below as expectations, not gates.

### Soft targets by area

| Area                         | Target                           | Rationale                                                            |
| :--------------------------- | :------------------------------- | :------------------------------------------------------------------- |
| `src/core` (pure-JS + React) | **~80% lines**                   | jsdom can exercise nearly all of it; no excuse for gaps              |
| `src/webgpu` (TSL hooks)     | **best-effort via the mock**     | jsdom can't run the GPU; raise the `WebGPUContext` mock to lift this |
| New / changed v10 surface    | **dedicated test before stable** | a green suite must actually guard the headline features              |

### Highest-value coverage to add

These are the v10-_changed_ surfaces with little or no dedicated coverage — the highest return per test:

- **Render-phase takeover** — default render skipped when a `{ phase: 'render' }` job is registered; resumes on unmount. _(integration with `@pmndrs/scheduler`)_
- **fps throttling end-to-end** via `useFrame({ fps: N })` (`drop: true/false`). _(integration, not the upstream `shouldRun` predicate)_
- **Canvas size control** — `width`/`height`/`forceEven`; `setSize()` variants + ownership state machine; DPR.
- **Multi-canvas pure-JS** — `canvasRegistry` register/wait/unregister; the `renderer` config-bag parser.
- **`ScopedStore` Proxy** — get / `.scope()` / `.has()` / `.keys()` / `Object.keys()` / spread / `for…in` / missing-scope.
- **`interactivePriority` sort**, **XR `registerPointer`/`unregisterPointer`**, **frame-timed event edges**, **`textureColorSpace`**, **`gl` deprecation warning path**, **`useRenderTarget` per-entry differences**.
- **WebGPU hook lifecycle via the mock** — `useUniforms` / `useNodes` / `useBuffers` / `useGPUStorage` / `useRenderPipeline` create/update/dispose/rebuild; `_hmrVersion` rebuild logic.

> Any per-file coverage numbers quoted in docs are point-in-time snapshots — re-run `pnpm test` for current numbers; don't trust a table after the code moves.

---

## Bundle & type verification (built output)

Separate from the test suite: these check the **built `dist`**, not source. They guarantee each entry point bundles the correct THREE.js imports and ships standalone.

```bash
pnpm build && pnpm verify-bundles   # correct three / three/webgpu imports per entry, standalone
pnpm verify-types                   # per-entry type declarations resolve
pnpm analyze-fiber                  # dry-run @react-three/fiber package contents
pnpm analyze-test                   # dry-run @react-three/test-renderer package contents
```

What `verify-bundles` checks:

- Default bundle contains both `from 'three'` and `from 'three/webgpu'`.
- Legacy bundle contains `from 'three'` but **not** `from 'three/webgpu'` or `from 'three/tsl'`.
- WebGPU bundle contains `from 'three/webgpu'` but **not** plain `from 'three'`.
- All bundles are standalone (no shared chunks).

These belong in CI as well as locally — see the parity note above.

---

## Troubleshooting

**Changes not showing?** Run `pnpm stub` to regenerate the `dist/` → `src/` development links.

**Import errors in the IDE?** Restart the TypeScript server or run `pnpm typecheck`.

**"EPERM" / symlink errors on Windows?** Enable [Developer Mode](https://howtogeek.com/292914/what-is-developer-mode-in-windows-10) for symlink support.

**"Multiple instances of Three.js" warning?** Common in Vitest/jsdom — safe to ignore; common variants are suppressed in `setupTests.ts`.

**"Cannot find module" errors?** Ensure `pnpm install` ran; if the error references `dist`, run `pnpm stub`.

**`verify-bundles` fails?** You must `pnpm build` first. If a bundle contains a forbidden import, check `#three` alias resolution in `build.config.ts`.

**Package too small in `analyze-*` dry-run?** If it shows ~100–200 KB instead of the expected ~MB, `dist/` is being excluded — ensure the package's `files` field includes `dist`.

---

## Unification & coverage roadmap

Open work to bring local/CI testing fully into line with this guide. Trim items as they land.

### Parity & CI

- [x] **Make CI run the same checks as `pnpm run ci`.** `verify-bundles` + `verify-types` now run in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) right after Build, matching the local `pnpm run ci` order. _(task D5)_
- [x] **Surface coverage in CI** — the `text-summary` reporter prints totals in the run log, and the `coverage/` report is uploaded as a build artifact (no failing threshold yet).

### Coverage (soft now → hard at stable)

- [x] Add the highest-value tests listed above — landed: render-phase takeover, fps throttling, Canvas size control, multi-canvas pure-JS, `ScopedStore`, `interactivePriority`, XR pointers, frame-timed events, `textureColorSpace`, `gl` deprecation (+ hardened heuristic, task D1), `useRenderTarget`, and WebGPU hook lifecycle. Overall lines coverage ~78%.
- [ ] **At stable:** add a coverage floor in `vitest.config.ts` (e.g. ~80% lines on `src/core`, lower on `src/webgpu`). _(task D4)_

### WebGPU tiers

- [~] **Invest in the `WebGPUContext` mock** — done for the TSL hook lifecycle (`useUniforms`/`useNodes`/`useBuffers`/`useGPUStorage`/`useRenderPipeline` now 62–90% via the mock). Extend further as new GPU paths become mockable.
- [ ] **Stand up the Tier-2 Playwright harness** (`pnpm test:gpu`, Chromium + WebGPU, pointed at the example app) so the [Tier-2 checklist](#what-tier-2-must-prove-the-checklist) is a runnable suite, not a manual list. _(task C0)_
- [ ] **Spike Tier 3** — headless WebGPU via SwiftShader/Dawn; if it runs our paths, add a non-blocking CI job. _(task D8)_
      </content>
      </invoke>
