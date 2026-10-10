# Testing Guide

This is the **canonical** testing guide for `@react-three/fiber`. It is the single source of truth for how we test — for both human contributors and coding agents. If you are adding a test, fixing CI, or planning coverage work, start here.

---

## TL;DR

```bash
pnpm test            # Tier 1: unit + mock suite with coverage (what CI runs)
pnpm test:watch      # Tier 1: watch mode, no coverage
pnpm test:gpu        # Tier 3: real WebGPU device, headless (needs Vulkan on Linux, see below)
pnpm run ci          # Full local gate: build → verify → typecheck → eslint → test → format
```

- **Tier 1 (this repo's everyday suite)** runs in jsdom on every PR. Pure-JS logic + hook lifecycle against mocks.
- **Tier 3 (headless WebGPU)** runs on every PR too, as its own CI job: R3F on a real WebGPU device (Dawn in Node), reading rendered pixels back.
- **Tier 2 (browser/GPU)** proves what needs a real browser and GPU (`<Canvas>`, events, TSL HMR). It runs on a machine with a GPU as a **pre-release gate**, not on every PR. _(Strategy documented below; harness not yet built.)_

If you only remember one rule: **a green `pnpm test` does not prove the WebGPU runtime works** — `pnpm test:gpu` proves the part of it that runs headless, and Tier 2 the rest.

---

## The three-tier model

R3F spans pure JS, React reconciliation, and a GPU runtime that jsdom cannot execute. One test runner can't cover all of that, so we split by _what each tier can actually prove_.

| Tier                    | Command                         | Runs where              | Proves                                                                                                                                                                     | Gate                     |
| :---------------------- | :------------------------------ | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| **1 — Unit + mock**     | `pnpm test`                     | CI, every PR (jsdom)    | Pure-JS logic, React behavior, hook create/update/dispose/rebuild against the `WebGPUContext` mock, export parity                                                          | **Per-PR (blocking)**    |
| **2 — Browser / GPU**   | `pnpm test:browser` _(planned)_ | Local GPU box / display | Real WebGPU in a browser: `<Canvas>` init and first frame, render-pipeline delegation, occlusion, TSL HMR, events                                                          | **Pre-release (manual)** |
| **3 — Headless WebGPU** | `pnpm test:gpu`                 | CI, every PR (own job)  | Real WebGPU without a browser or physical GPU (Dawn in Node): rendered pixels, depth attachments, node materials and TSL uniforms, multi-canvas sharing, renderer disposal | **Per-PR**               |

**The remaining CI gap:** per-PR CI now guards the mock + pure-JS layer (Tier 1) and what a root draws on a real device (Tier 3). What needs a browser (`<Canvas>`, DOM events, Vite HMR) or a hardware GPU's behaviour is still caught at the Tier-2 pre-release gate, not on the PR that introduces it.

**Design principle — push work down a tier.** The cheapest, most reliable test is a Tier-1 test. Before writing a GPU test, ask: _can this run against the `WebGPUContext` mock instead?_ Lifecycle, wiring, store resolution, and rebuild logic usually can. Genuinely GPU-dependent behavior (does it actually render? is the depth correct?) goes to Tier 3 if it can run on `createRoot` without a DOM, and to Tier 2 only if it cannot.

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

- **Pure-JS logic** — the multi-canvas registry in `renderer.ts`, the `renderer` config-bag parser, `ScopedStore` Proxy semantics, prop diffing, background parsing.

> **The frame scheduler is an external dependency** (`@pmndrs/scheduler`) as of alpha.3 — its internals (phase graph, topo sort, fps rate limiter) are unit-tested **upstream**, not here. This repo tests the **integration**: that `useFrame` drives the scheduler correctly (phase ordering, render-phase takeover, fps throttling end-to-end, pause/resume). Don't re-test scheduler internals in R3F.

- **React behavior** — reconciliation, hooks (`useFrame`, `useThree`, `useLoader`, …), event handling and raycasting, store updates.
- **Export parity** — each entry point (`default` / `legacy` / `webgpu`) exports the right symbols (`tests/{default,legacy,webgpu}/index.test.tsx`).
- **WebGPU hook lifecycle via the mock** — create / update / dispose / rebuild for the TSL hooks, exercised against `WebGPUContext` (see [Mocks](#mocks-and-the-webgpu-context)).

### What Tier 1 _cannot_ cover

Anything that needs a real GPU device: actual rendering, node-material compilation, render-pipeline output, occlusion queries, real TSL HMR. Those are Tier 3 (headless) or Tier 2 (browser). Don't fake a passing assertion for them in jsdom — write the Tier-3 test, or leave an `it.todo` pointing at the Tier-2 check.

### Mocks and the WebGPU context

jsdom has no WebGL or WebGPU. We stub them so Tier 1 can run:

- [`packages/fiber/tests/setupTests.ts`](../../packages/fiber/tests/setupTests.ts) — mocks WebGL2, `ResizeObserver`, `PointerEvent`, and suppresses the benign "multiple instances of Three.js" warning.
- [`packages/test-renderer/src/WebGPUContext.ts`](../../packages/test-renderer/src/WebGPUContext.ts) — a mock WebGPU context that lets hook lifecycle tests run without a device.

**The `WebGPUContext` mock is the single biggest lever for CI coverage.** Every behavior we can drive against it is a behavior that moves from "Tier-2 browser-only" into "Tier-1, guarded on every PR." Investing in the mock is preferred over deferring a hook to browser-only validation. Document clearly, in the test, which paths are mock-validated vs which still require Tier 2.

---

## Tier 2 — Browser / GPU validation

**Status: strategy decided, harness not yet built (planned `pnpm test:browser`).** Part of the checklist below now runs headless on every PR in [Tier 3](#tier-3--headless-webgpu-in-ci-pnpm-testgpu); the rest still needs a browser.

WebGPU is a first-class, baseline path in v10 — not an exotic add-on. The stable WebGPU surface ships in 10.0, so it must be validated against a real device before each release. Tier 2 is that gate.

### How it works

Non-headless Playwright (`headless: false`, Chromium with WebGPU enabled) drives the **example app** on a machine with a real GPU + display. It is scripted and repeatable — it replaces ad-hoc "I clicked around and it looked fine" browser checks.

It is **not** a per-PR CI gate (it needs a physical GPU + display). Treat it as a **pre-release gate**: run it during a release pass and before each promotion (alpha → beta → RC → stable).

### What Tier 2 must prove (the checklist)

These are the real-GPU behaviors no jsdom/mock test can reach. Each should become a scripted Playwright check against the example app. _Tier 3 notes_ say which part already runs headless on `createRoot`; the browser check still owes the `<Canvas>` half.

1. **Basic WebGPU render** — `<Canvas>` inits without a manual `renderer.init()`; first frame draws; no depth mismatch. _Tier 3: `render.gpu.test.tsx`, `primary-depth.gpu.test.tsx`._
2. **WebGPU-only entry** — `@react-three/fiber/webgpu` runs with no WebGL renderer loaded; node materials resolve from the root's namespace. _Tier 3: node materials on the root entry, `render.gpu.test.tsx`._
3. **Multi-canvas shared renderer** — a `<Canvas primary>` + a plain secondary `<Canvas>` (auto-sharing) and one with `share="main"` share one renderer, switch targets correctly, clean up, render after the primary by default, honor `scheduler={{ after, fps }}`, **and share state via `primaryStore`**. jsdom covers the sharing rules and timing (`tests/multi-canvas-primary.test.tsx`); this checks the pixels. _Tier 3: `multi-canvas.gpu.test.tsx`, and the shared uniform in `packages/tsl/tests/gpu/uniforms.gpu.test.tsx`._
4. **Occlusion** — `onOccluded` / `onVisible` fire only on state change; clean up on unmount.
5. **Render pipeline** — `useRenderPipeline` makes the default render delegate to `renderPipeline.render()`.
6. **TSL HMR** — editing a TSL node in Vite rebuilds without a full reload and leaves no stale nodes/uniforms.
7. **Camera parenting** — camera children render and clean up.

### When the harness is built (future)

```bash
pnpm test:browser    # run the Playwright/WebGPU suite against the example app (planned)
```

Proposed layout: a separate Playwright project (e.g. `e2e/` or `packages/fiber/e2e/`) with `*.gpu.spec.ts` files and its own config — kept **out** of the Vitest `include` glob so it never runs accidentally in jsdom CI. Until then, the checklist above is run manually on a GPU box.

---

## Tier 3 — Headless WebGPU in CI (`pnpm test:gpu`)

R3F against a real WebGPU device, with no browser and no physical GPU. [`vitest-environment-webgpu-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgpu-node) backs `navigator.gpu` with Google's Dawn in the Node process and provides a headless canvas whose `webgpu` context renders into a real texture; the tests read that texture back. It runs on every PR as the `Headless WebGPU tests` job in [`.github/workflows/test.yml`](../../.github/workflows/test.yml).

```bash
pnpm test:gpu                                           # the whole Tier-3 project
pnpm test:gpu packages/fiber/tests/gpu/render.gpu.test.tsx  # one file
UPDATE_SCREENSHOTS=1 pnpm test:gpu                      # rewrite screenshot baselines (see below)
```

### Running it locally

- **Linux:** Dawn needs Vulkan. Without a GPU (a container, WSL, a CI runner) install Mesa's software Vulkan driver, lavapipe: `sudo apt-get install -y mesa-vulkan-drivers`. A machine with a GPU and its Vulkan driver works as is.
- **macOS:** Dawn uses Metal. Nothing to install.
- **Windows:** not tried; Dawn's D3D12 backend should work, but CI does not cover it.

It needs Node 22+ (the repo's version). The suite takes a few seconds.

### How it is set up

- [`vitest.gpu.config.ts`](../../vitest.gpu.config.ts) is its own Vitest config with `environment: 'webgpu-node'`. It shares the jsdom project's source aliases and **nothing else**: no `setupFiles` (they mock WebGL and WebGPU, which must stay real here) and no coverage.
- It includes `packages/**/tests/gpu/**/*.gpu.test.{ts,tsx}`; [`vitest.config.ts`](../../vitest.config.ts) excludes `**/tests/gpu/**`, so `pnpm test` and the coverage ratchet never load these files.
- [`packages/fiber/tests/gpu/harness.tsx`](../../packages/fiber/tests/gpu/harness.tsx) has the helpers: `mount()` configures a root on a headless canvas (`frameloop: 'never'`, a camera framing a 2x2 quad, tone mapping off so read-back colours equal material colours), `frame()` draws one frame through R3F's own loop, and `expectColor()` compares a pixel with a per-channel tolerance.

### What runs there

| File                                                     | Proves                                                                                                                                                                                          |
| :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/fiber/tests/gpu/render.gpu.test.tsx`           | The root entry builds a `WebGPURenderer` on the WebGPU backend (`gl === renderer`), draws the first frame without a manual `init()`, compiles node materials, and matches a screenshot baseline |
| `packages/fiber/tests/gpu/primary-depth.gpu.test.tsx`    | A lone primary's depth attachment matches its drawing buffer, at mount and after a resize (#3847 / #3905: Dawn rejects the frame if it does not)                                                |
| `packages/fiber/tests/gpu/multi-canvas.gpu.test.tsx`     | Secondaries (`share="id"` and automatic) draw their own scenes through the primary's renderer, at their own sizes, including after resizing while inactive                                      |
| `packages/fiber/tests/gpu/renderer-dispose.gpu.test.tsx` | Unmount destroys the device of a renderer R3F built (a shared one only after its last canvas), and leaves a caller's renderer alive and drawing                                                 |
| `packages/tsl/tests/gpu/uniforms.gpu.test.tsx`           | A `useUniforms` uniform in a node material recolours the output when `.value` changes, with no re-render; a secondary reads the primary's uniform                                               |

### Limits

- **No DOM.** The environment provides `window`, `document`, a canvas, `Image`, `fetch` and `requestAnimationFrame`, but no react-dom layout, `ResizeObserver` or pointer events. Use `createRoot` with an explicit `size`, never `<Canvas>`. `<Canvas>` and event tests stay in jsdom (Tier 1) and the browser (Tier 2).
- **Not a browser.** Dawn in Node is the same implementation Chrome uses, but browser integration (presentation, `devicePixelRatio`, HMR) is Tier 2.
- **Software rasterizer in CI.** lavapipe is slow for heavy scenes and rounds slightly differently from a hardware GPU. Assert colours with `expectColor`'s tolerance, not exact equality, and keep scenes small (32–64 px).

### Screenshot baselines

[`vitest-screenshot`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-screenshot) adds `await expect(canvas).toMatchScreenshot('name.png', options)`. Baselines are PNGs in `__screenshots__/` beside the test, and they are committed.

- A missing baseline is written on a local run and **fails in CI**, so commit the new PNG with the test.
- Rasterizers disagree on edge pixels: always pass a tolerance, e.g. `comparatorOptions: { allowedMismatchedPixelRatio: 0.02 }`.
- Regenerate with `UPDATE_SCREENSHOTS=1 pnpm test:gpu` (or `pnpm test:gpu -u`) **only when the rendering change is intended**, and look at the new PNG before committing it.
- On a mismatch, `<name>.actual.png` and `<name>.diff.png` are written next to the baseline (gitignored); CI uploads them as the `gpu-screenshots` artifact.

Prefer pixel assertions (`expectColor`) for behaviour; keep screenshots for "does the whole picture still look right".

---

## Local ↔ CI parity (one source of truth)

The local full gate and the CI workflow **must run the same checks in the same way**, or they drift and "passes locally" stops meaning anything.

- **Local full gate:** `pnpm run ci` → `build → verify-treeshake → verify-types → typecheck → eslint → dev → test → format`.
- **CI workflow:** [`.github/workflows/test.yml`](../../.github/workflows/test.yml) — runs on PRs and `master`, across a React version matrix (19.0.0 + latest).

> CI runs `verify-treeshake` and `verify-types` right after the build, matching the local order.

**Rule for new checks:** if you add a verification step, add it to _both_ the `ci` script and the workflow — or, better, add it to the shared script the workflow calls.

> The one exception is `pnpm test:gpu`: it is a separate CI job and stays out of `pnpm run ci`, because it needs a Vulkan driver (Linux) that not every contributor machine has. Run it yourself when you touch rendering, the renderer lifecycle or multi-canvas.

---

## Test organization & conventions

### Where tests live

| Location                                        | Contents                                                                          | Naming                 |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- | :--------------------- |
| `packages/fiber/tests/*.test.tsx`               | Core unit + integration tests (events, hooks, renderer, scheduler, visibility, …) | `<area>.test.tsx`      |
| `packages/fiber/tests/{default,legacy,webgpu}/` | Per-entry export-parity tests                                                     | `index.test.tsx`       |
| `packages/fiber/tests/setupTests.ts`            | Global mocks (WebGL2, ResizeObserver, PointerEvent)                               | —                      |
| `packages/fiber/tests/gpu/`                     | Tier-3 headless WebGPU tests, `harness.tsx` helpers, `__screenshots__/` baselines | `<area>.gpu.test.tsx`  |
| `packages/tsl/tests/gpu/`                       | Tier-3 tests of the TSL hooks on a real device                                    | `<area>.gpu.test.tsx`  |
| `packages/test-renderer/src/__tests__/`         | Test-renderer suite                                                               | `RTTR.<area>.test.tsx` |
| `packages/test-renderer/src/WebGPUContext.ts`   | WebGPU mock used for hook lifecycle tests                                         | —                      |
| `e2e/` _(planned)_                              | Tier-2 Playwright/WebGPU checks                                                   | `*.gpu.spec.ts`        |

### Conventions

- **One area per file.** Match the source file/feature you're testing (`events.ts` → `events.test.tsx`).
- **Co-locate TSL hook tests** in `packages/tsl/tests/` (fiber's own WebGPU-entry tests stay in `packages/fiber/tests/webgpu/`) and drive them against `WebGPUContext`. Note in the file which assertions are mock-validated vs Tier-2-only.
- **Keep GPU tests out of jsdom.** Tier-3 tests are `*.gpu.test.tsx` under a `tests/gpu/` folder, which only `vitest.gpu.config.ts` includes. Tier-2 browser specs use a distinct extension (`*.gpu.spec.ts`) and live outside both `include` globs.
- **Label the irreducible.** If a behavior genuinely needs a GPU, write the Tier-3 test; if it needs a browser too, leave an `it.todo('covered by Tier 2: <check>')` rather than a hollow jsdom assertion — that keeps the gap visible.
- **Tests run against source**, not `dist`. Bundle/type correctness is verified separately (below).

### How to add a test

- **Pure-JS / React behavior** → add a `*.test.tsx` in `packages/fiber/tests/`, run `pnpm test:watch`.
- **A TSL hook's lifecycle** → add a test under `packages/tsl/tests/` driven by `WebGPUContext`; cover create/update/dispose/rebuild. If a path needs a real device, stop and add it to the Tier-2 checklist instead.
- **A new export** → add/extend the parity test in `tests/{default,legacy,webgpu}/`.
- **A real-GPU behavior** → if it runs on `createRoot` without a DOM, add a `*.gpu.test.tsx` under `packages/<pkg>/tests/gpu/` using `harness.tsx` and run `pnpm test:gpu` ([Tier 3](#tier-3--headless-webgpu-in-ci-pnpm-testgpu)). Otherwise add it to the [Tier-2 checklist](#what-tier-2-must-prove-the-checklist).

---

## Coverage

Coverage uses the v8 provider; reporters are `text`, `text-summary`, `json`, and `html` (configured in [`vitest.config.ts`](../../vitest.config.ts)). Open `coverage/index.html` after `pnpm test` for the line-by-line view.

### Current policy: a ratchet that blocks drops

`pnpm test` runs with `--coverage`, and `vitest.config.ts` sets global `coverage.thresholds` (lines, functions, statements, branches). If any total falls below its threshold the run fails, so **CI fails on a coverage drop**.

The thresholds are a **ratchet, not a target**: each sits just under what the suite currently achieves, measured on the lower of the CI React legs (`19.0.0` reads slightly below `latest`) and floored with ~0.5–1% headroom so neither leg flakes. When coverage goes up, raise them; never lower one to make a build pass. `lines` is the meaningful figure for R3F's own code — statements/branches read low because v8 also counts the bundled three.js code the suite touches.

The per-area targets below are **not** enforced by config; treat them as expectations, not gates.

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
- **Multi-canvas pure-JS** — `renderer.ts` register/wait/unregister; the `renderer` config-bag parser.
- **`ScopedStore` Proxy** — get / `.scope()` / `.has()` / `.keys()` / `Object.keys()` / spread / `for…in` / missing-scope.
- **`interactivePriority` sort**, **XR `registerPointer`/`unregisterPointer`**, **frame-timed event edges**, **`textureColorSpace`**, **`gl` deprecation warning path**, **`useRenderTarget` per-entry differences**.
- **WebGPU hook lifecycle via the mock** — `useUniforms` / `useNodes` / `useBuffers` / `useGPUStorage` / `useRenderPipeline` create/update/dispose/rebuild; `_hmrVersion` rebuild logic.

> Any per-file coverage numbers quoted in docs are point-in-time snapshots — re-run `pnpm test` for current numbers; don't trust a table after the code moves.

---

## Bundle & type verification (built output)

Separate from the test suite: these check the **built `dist`**, not source. What matters is what an app downloads, and that depends on transitive imports, chunk assignment and the bundler -- none of which a grep over `dist` can see. So `verify-treeshake` writes small consumer apps, bundles each with Vite (Rollup) and with esbuild, and checks the output.

```bash
pnpm build && pnpm verify-treeshake   # consumer bundles carry exactly the expected renderer(s)
pnpm verify-types                     # per-entry declarations: ThreeExports, JSX augmentation, hygiene, consumers
pnpm analyze-fiber                    # dry-run @react-three/fiber package contents
pnpm analyze-test                     # dry-run @react-three/test-renderer package contents
```

What `verify-treeshake` checks, per bundler:

- **Root app** (`Canvas` from `@react-three/fiber`): the eager output carries neither renderer; the one lazy renderer chunk carries WebGPU only, and no chunk carries WebGL.
- **`/webgpu` app**: the WebGPU renderer and never the WebGL one. **`/legacy` app**: the reverse.
- **A library importing hooks** from the root or `/extension` entry adds no renderer, next to any app, and core is bundled once.
- **Root app with `<Environment>`**: the decoders stay lazy.

`R3F_TREESHAKE_DUMP=1` keeps every case's output under `node_modules/.cache/r3f-verify-treeshake`; `R3F_TREESHAKE_VERBOSE=1` prints every check.

These belong in CI as well as locally — see the parity note above.

---

## Troubleshooting

**Changes not showing?** Run `pnpm stub` to regenerate the `dist/` → `src/` development links.

**Import errors in the IDE?** Restart the TypeScript server or run `pnpm typecheck`.

**"EPERM" / symlink errors on Windows?** Enable [Developer Mode](https://howtogeek.com/292914/what-is-developer-mode-in-windows-10) for symlink support.

**"Multiple instances of Three.js" warning?** Common in Vitest/jsdom — safe to ignore; common variants are suppressed in `setupTests.ts`.

**"Cannot find module" errors?** Ensure `pnpm install` ran; if the error references `dist`, run `pnpm stub`.

**`verify-treeshake` fails?** You must `pnpm build` first (`pnpm install` re-stubs `dist`). A renderer in the eager output means something in `src/core/` imports a value from `three`/`three/webgpu`, or a module that does (a three addon) is imported statically; see [BUILD.md](./BUILD.md).

**A test on the root entry fails inside three's WebGL backend?** The root entry renders with `WebGPURenderer`, which in jsdom runs its WebGL2 fallback backend against the WebGL mock. `setupTests.ts` stubs what that backend needs and jsdom lacks (`ImageBitmap`; the mock's `getSupportedExtensions`), so a frame can render. Tests that exercise core behaviour (events, visibility, sizing, Suspense) rather than the renderer still import `Canvas` / `createRoot` from `../src/legacy`, which renders through the WebGL mock directly; that keeps them independent of the WebGPU backend. Tests of WebGPU behaviour mock the renderer (see `renderer-lifecycle.test.tsx`) or use `frameloop: 'never'`.

**Tests rendering on the root entry time out or find `scene` null?** The root entry loads a renderer support with a dynamic import. `setupTests.ts` imports both supports so that import is cached and resolves inside `act()`; a test that builds a bare store with `createStore` must `registerThree(...)` itself (see `webgpu/useRenderTarget.test.tsx`).

**`pnpm test:gpu` fails with no adapter, or `navigator.gpu.requestAdapter()` returns null?** Dawn found no Vulkan driver. On Linux install `mesa-vulkan-drivers` (lavapipe); check `/usr/share/vulkan/icd.d/` lists `lvp_icd.json`.

**A Tier-3 test logs a WGSL error (`... is a reserved keyword`) and reads back transparent pixels?** The shader failed to compile on the device; the jsdom mock never compiles shaders, so only Tier 3 sees this. A uniform's name becomes its WGSL identifier, so a `useUniforms` key such as `shared` breaks compilation.

**A Tier-3 screenshot fails in CI but passes locally?** Your machine rasterizes differently from lavapipe. Look at the uploaded `gpu-screenshots` artifact; raise the tolerance only if the diff is edge pixels, and regenerate the baseline on Linux with lavapipe if the picture legitimately changed.

**Package too small in `analyze-*` dry-run?** If it shows ~100–200 KB instead of the expected ~MB, `dist/` is being excluded — ensure the package's `files` field includes `dist`.

---

## Unification & coverage roadmap

Open work to bring local/CI testing fully into line with this guide. Trim items as they land.

### Parity & CI

- [x] **Make CI run the same checks as `pnpm run ci`.** `verify-treeshake` + `verify-types` now run in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) right after Build, matching the local `pnpm run ci` order. _(task D5)_
- [x] **Surface coverage in CI** — the `text-summary` reporter prints totals in the run log, and the `coverage/` report is uploaded as a build artifact (from the `latest` React leg).

### Coverage

- [x] Add the highest-value tests listed above — landed: render-phase takeover, fps throttling, Canvas size control, multi-canvas pure-JS, `ScopedStore`, `interactivePriority`, XR pointers, frame-timed events, `textureColorSpace`, `gl` deprecation (+ hardened heuristic, task D1), `useRenderTarget`, and WebGPU hook lifecycle. Overall lines coverage ~78%.
- [x] **Coverage floor** — global `coverage.thresholds` in `vitest.config.ts` fail `pnpm test` (and CI) on a drop; see [Current policy](#current-policy-a-ratchet-that-blocks-drops). _(task D4)_
- [ ] **Per-area floors** — the soft targets above (e.g. ~80% lines on `src/core`, lower on `src/webgpu`) are not yet enforced per directory.

### WebGPU tiers

- [~] **Invest in the `WebGPUContext` mock** — done for the TSL hook lifecycle (`useUniforms`/`useNodes`/`useBuffers`/`useGPUStorage`/`useRenderPipeline` now 62–90% via the mock). Extend further as new GPU paths become mockable.
- [ ] **Stand up the Tier-2 Playwright harness** (`pnpm test:browser`, Chromium + WebGPU, pointed at the example app) so the [Tier-2 checklist](#what-tier-2-must-prove-the-checklist) is a runnable suite, not a manual list. _(task C0)_
- [x] **Tier 3 in CI** — `pnpm test:gpu` runs R3F on Dawn (vitest-environment-webgpu-node) on every PR, on lavapipe. _(task D8, #4015)_
- [ ] **More Tier-3 coverage** — `useRenderPipeline` output, `onOccluded` / `onVisible` with real occlusion queries, `useRenderTarget` read-back, and a macOS (Metal) leg in CI.
