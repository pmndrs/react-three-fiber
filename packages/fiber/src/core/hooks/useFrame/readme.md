# Frame Loop

`useFrame`, the scheduler, phases, fps throttling, pause/resume, render takeover, and demand mode.

```ts
import { useFrame, invalidate, advance, getScheduler } from '@react-three/fiber'
```

| Export         | What it does                                                          |
| -------------- | --------------------------------------------------------------------- |
| `useFrame`     | Run a callback each frame — phase ordering, fps throttling, pause     |
| `getScheduler` | The global singleton — phases, roots, jobs, loop control, manual step |
| `invalidate`   | Request a frame in demand mode                                        |
| `advance`      | Step the loop manually in `frameloop="never"`                         |

📖 **Full documentation:** https://docs.pmnd.rs/react-three-fiber/frame-loop
