A number as `useFrame`'s second argument is deprecated in v10, and its meaning changed:

- **A positive number** still takes over rendering, as in v9: R3F stops rendering the scene, and the
  callback has to. Say so with `{ phase: 'render' }`, which does the same thing explicitly. The rule
  offers this as a suggestion.
- **A negative number** meant "run before the default jobs" in v9. v10 maps the number to
  `{ priority: n }` and runs higher priorities **first**, so a negative number now runs **after**
  them. Use a phase (`'start'`, `'input'`, `'physics'`, `'update'`, `'render'`, `'finish'`) or
  `{ before, after }` to name the order you need.

`0` is the default and is not reported.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera), 1)
useFrame(() => physicsStep(), -2)
```

#### ✅ Correct

```js
useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera), { phase: 'render' })
useFrame(() => physicsStep(), { phase: 'physics' })
```
