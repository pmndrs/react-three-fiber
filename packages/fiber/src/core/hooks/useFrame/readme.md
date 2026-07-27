# Frame Loop

`useFrame`, the scheduler, phases, fps throttling, pause/resume, render takeover, and demand mode.

```ts
import { useFrame } from '@react-three/fiber'
```

## API Reference

- **[useFrame](./readmes/useFrame.md)** — the per-frame hook: ordering, fps throttling, pause/resume
- **[Scheduler API](./readmes/scheduler.md)** — the global singleton: phases, roots, jobs, manual stepping
- **[Frame loop utilities](./readmes/frame-loop-api.md)** — `invalidate`, `advance`, deprecated globals

📖 **Full documentation:** https://docs.pmnd.rs/react-three-fiber/frame-loop

> Design notes for contributors live in `docs/development/frame-loop-design.md`.
