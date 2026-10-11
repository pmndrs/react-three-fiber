v10 removed `state.clock` (a `THREE.Clock`). The frame state carries its timing directly:

| Field     | Meaning                                    |
| --------- | ------------------------------------------ |
| `elapsed` | seconds since the first frame              |
| `delta`   | seconds since the last frame               |
| `time`    | the frame's high-resolution timestamp (ms) |

`state.clock` is `undefined` in v10, so code that reads it throws. The rule reports `clock` read
from the frame state or from `useThree`, and fixes `state.clock.getElapsedTime()` and
`state.clock.elapsedTime` in a frame callback to `state.elapsed`.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
useFrame((state) => {
  ref.current.rotation.y = state.clock.getElapsedTime()
})
```

```js
useFrame(({ clock }) => {
  ref.current.position.x += clock.getDelta()
})
```

#### ✅ Correct

```js
useFrame((state) => {
  ref.current.rotation.y = state.elapsed
})
```

```js
useFrame((state, delta) => {
  ref.current.position.x += delta
})
```
