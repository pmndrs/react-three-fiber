import { registerRootExtension } from '../../core/extensions'
import { clearHmrCaches } from '../../core/utils/hmr'

// The TSL resource hooks as a root extension -- the shape they will have once they move to
// @react-three/tsl. Core no longer calls into TSL code for hot reloads; it notifies extensions.
//
// Registered lazily from the hooks rather than as an import side effect: this package declares
// `sideEffects: false`, so a bundler may drop a module that only registers something.
let registered = false

export function ensureTSLExtension(): void {
  if (registered) return
  registered = true
  registerRootExtension({
    name: '@react-three/tsl',
    // Resolves primaryStore itself, so every canvas sharing a renderer refreshes the same resources.
    hmr: clearHmrCaches,
  })
}
