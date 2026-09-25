import * as React from 'react'

import type { RootStore } from '#types'

//* Cross-Bundle Singleton ==============================
// Use Symbol.for() to ensure context is shared across bundle boundaries
// This prevents issues when mixing imports from @react-three/fiber and @react-three/fiber/webgpu
//
// Lives in its own module (no #three imports) so the three-free @react-three/fiber/extension entry
// can ship it without pulling in a copy of core. store.ts re-exports it.
const R3F_CONTEXT = Symbol.for('@react-three/fiber.context')

export const context: React.Context<RootStore> =
  (globalThis as any)[R3F_CONTEXT] ?? ((globalThis as any)[R3F_CONTEXT] = React.createContext<RootStore>(null!))
