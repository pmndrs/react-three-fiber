The global loop callbacks are deprecated in v10 and log a warning. The scheduler replaces them:

| v9                   | v10                                            |
| -------------------- | ---------------------------------------------- |
| `addEffect(cb)`      | `useFrame(cb, { phase: 'start' })`             |
| `addAfterEffect(cb)` | `useFrame(cb, { phase: 'finish' })`            |
| `addTail(cb)`        | `scheduler.onIdle(cb)` (from `getScheduler()`) |

Only calls to the functions imported from `@react-three/fiber` are reported.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
import { addEffect } from '@react-three/fiber'

addEffect(() => stats.begin())
```

#### ✅ Correct

```js
useFrame(() => stats.begin(), { phase: 'start' })
```
