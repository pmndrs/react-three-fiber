# @react-three/eslint-plugin

[![Version](https://img.shields.io/npm/v/@react-three/eslint-plugin?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/eslint-plugin)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

An ESLint plugin which provides lint rules for [@react-three/fiber](https://github.com/pmndrs/react-three-fiber).

## Installation

```bash
npm install @react-three/eslint-plugin --save-dev
```

## Configuration

The plugin supports ESLint 8.57 and later. Its default export is a plugin object with flat configs.

### Flat config (`eslint.config.js`)

Use the recommended [config](#recommended) to get reasonable defaults:

```js
import threePlugin from '@react-three/eslint-plugin'

export default [
  // ...other configs
  threePlugin.configs.recommended,
]
```

Or register the plugin and enable the rules you want:

```js
import threePlugin from '@react-three/eslint-plugin'

export default [
  {
    plugins: { '@react-three': threePlugin },
    rules: {
      '@react-three/no-new-in-loop': 'error',
      '@react-three/no-fast-state': ['error', { allowGuarded: false }],
    },
  },
]
```

### Legacy config (`.eslintrc`)

ESLint 8 with eslintrc uses the `legacy-` configs:

```json
"extends": [
  "plugin:@react-three/legacy-recommended"
]
```

Or add "@react-three" to the plugins section and enable the rules you want:

```json
"plugins": [
  "@react-three"
],
"rules": {
  "@react-three/no-new-in-loop": "error"
}
```

### Frame loop rules

The rules about the frame loop apply to every function that runs once per frame:

- callbacks passed to `useFrame`, including imported aliases such as `import { useFrame as useTick }`
  and namespaced calls such as `Fiber.useFrame`
- callbacks passed to `addEffect`, `addAfterEffect`, `setRenderOverride` and the frame scheduler's `register`
- functions nested inside any of these

A callback can be passed inline or by reference: `useFrame(update)` finds `update` when it is a
function declaration, a function expression, or `useCallback(fn, deps)` in the same file.

## Rules

✅ Enabled in the `recommended` [configuration](#recommended).<br>
🔄 Enabled in the `migration` [configuration](#migration), for upgrading from v9.<br>
🔧 Automatically fixable by the `--fix` [CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).<br>
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- START_RULE_CODEGEN -->
<!-- @command pnpm codegen:eslint -->

| Rule                                                                                | Description                                                                                                               | ✅  | 🔄  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | --- |
| <a href="./docs/rules/canvas-entry-compat.md">canvas-entry-compat</a>               | Disallow Canvas props, materials and events the Canvas entry does not support, which throw or silently fail.              | ✅  |     |     |     |
| <a href="./docs/rules/no-clone-in-loop.md">no-clone-in-loop</a>                     | Disallow cloning vectors in the frame loop which can cause performance problems.                                          | ✅  |     |     |     |
| <a href="./docs/rules/no-creator-side-effects.md">no-creator-side-effects</a>       | Disallow mutating the scene or camera in a TSL hook creator, which runs during render.                                    | ✅  |     |     |     |
| <a href="./docs/rules/no-deferred-resource-read.md">no-deferred-resource-read</a>   | Disallow reading shared TSL resources inside Fn() in a useLocalNodes creator, where the read is not tracked.              | ✅  |     |     |     |
| <a href="./docs/rules/no-deprecated-gl.md">no-deprecated-gl</a>                     | Replace `state.gl` with `state.renderer`.                                                                                 |     | 🔄  | 🔧  |     |
| <a href="./docs/rules/no-deprecated-loop-globals.md">no-deprecated-loop-globals</a> | Replace the deprecated global loop callbacks with useFrame phases and the scheduler.                                      |     | 🔄  |     |     |
| <a href="./docs/rules/no-fast-state.md">no-fast-state</a>                           | Disallow setting React state in the frame loop and continuous pointer events, which re-renders the component every frame. | ✅  |     |     |     |
| <a href="./docs/rules/no-frame-clock.md">no-frame-clock</a>                         | Replace the removed `state.clock` with the frame state timing fields.                                                     |     | 🔄  | 🔧  |     |
| <a href="./docs/rules/no-inline-node-props.md">no-inline-node-props</a>             | Disallow building TSL nodes inline in material props, which recompiles the shader every render.                           | ✅  |     |     |     |
| <a href="./docs/rules/no-invalid-dispose.md">no-invalid-dispose</a>                 | Require `dispose={null}` to opt out of disposal; `false` and other values are ignored.                                    | ✅  |     | 🔧  |     |
| <a href="./docs/rules/no-nested-fromref.md">no-nested-fromref</a>                   | Disallow fromRef() inside arrays and objects, where it is never resolved.                                                 | ✅  |     |     |     |
| <a href="./docs/rules/no-new-in-loop.md">no-new-in-loop</a>                         | Disallow instantiating new objects in the frame loop which can cause performance problems.                                | ✅  |     |     |     |
| <a href="./docs/rules/no-numeric-frame-priority.md">no-numeric-frame-priority</a>   | Replace numeric useFrame priorities, whose meaning changed in v10, with phases.                                           |     | 🔄  |     | 💡  |
| <a href="./docs/rules/no-onupdate-prop.md">no-onupdate-prop</a>                     | Disallow the removed `onUpdate` prop on three.js elements.                                                                |     | 🔄  |     |     |
| <a href="./docs/rules/no-removed-canvas-props.md">no-removed-canvas-props</a>       | Replace Canvas props that v10 removed or moved into the renderer settings.                                                |     | 🔄  | 🔧  |     |
| <a href="./docs/rules/no-removed-imports.md">no-removed-imports</a>                 | Replace imports that v10 moved, deprecated or removed.                                                                    |     | 🔄  | 🔧  |     |
| <a href="./docs/rules/no-unstable-args.md">no-unstable-args</a>                     | Disallow new objects in `args` and `<primitive object>`, which rebuild the three.js object every render.                  | ✅  |     |     |     |
| <a href="./docs/rules/prefer-canvas-background.md">prefer-canvas-background</a>     | Prefer the Canvas `background` prop over `<color attach="background">`.                                                   |     | 🔄  |     |     |
| <a href="./docs/rules/prefer-local-nodes-deps.md">prefer-local-nodes-deps</a>       | Require a dependency array on useLocalNodes, so the graph is not rebuilt on every render.                                 | ✅  |     |     | 💡  |
| <a href="./docs/rules/prefer-useloader.md">prefer-useloader</a>                     | Prefer useLoader over calling a three.js loader inside effects and memos.                                                 | ✅  |     |     |     |

<!-- END_CODEGEN -->

## Shareable configs

| Flat config           | Legacy config                            | Contents                                                                                                                  |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `configs.recommended` | `plugin:@react-three/legacy-recommended` | <a id="recommended"></a>Rules appropriate for everyone using React Three Fiber, marked ✅ above.                          |
| `configs.all`         | `plugin:@react-three/legacy-all`         | <a id="all"></a>Every rule in the plugin.                                                                                 |
| `configs.migration`   | `plugin:@react-three/legacy-migration`   | <a id="migration"></a>Rules for upgrading an app from React Three Fiber v9 to v10, marked 🔄 above. Most are autofixable. |

The `migration` config is meant to sit next to `recommended` while you upgrade, then come out once
the app is on v10:

```js
import threePlugin from '@react-three/eslint-plugin'

export default [threePlugin.configs.recommended, threePlugin.configs.migration]
```

Run `eslint --fix` to apply the safe rewrites (`state.gl` to `state.renderer`, moved imports, the
`renderer` boolean); the rest are reported with the change to make.

### Migrating from 0.x

- `configs.recommended` and `configs.all` are flat configs now. In an `.eslintrc`, replace
  `plugin:@react-three/recommended` with `plugin:@react-three/legacy-recommended`, and
  `plugin:@react-three/all` with `plugin:@react-three/legacy-all`.
- `eslint` is a peer dependency (`^8.57.0 || ^9.0.0 || ^10.0.0`), so the plugin uses your project's
  ESLint instead of installing its own copy.
