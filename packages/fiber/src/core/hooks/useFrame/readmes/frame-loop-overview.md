# Frame Loop Overview

A single shared RAF scheduler drives every Canvas: phases, ordering, throttling, and modes.

```ts
import { useFrame } from '@react-three/fiber'
```

📖 **Full documentation:** https://docs.pmnd.rs/react-three-fiber/frame-loop

> Design notes for contributors live in `docs/development/frame-loop-design.md`.
