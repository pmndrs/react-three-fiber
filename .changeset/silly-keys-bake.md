---
'@react-three/fiber': minor
---

Allow to override `invalidate` so that you can do rendering on demand on canvases where R3F is not in charge of the loop.

Example:

```tsx
import { createRoot } from '@react-three/fiber'
const invalidate = () => {
  sharedCanvas.triggerRepaint()
  return 0
}
const root = createRoot(canvas, invalidate)
```
