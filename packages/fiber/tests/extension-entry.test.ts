/**
 * @react-three/fiber/extension — the three-free entry for packages that build on fiber.
 *
 * It must hand out the SAME context, hooks and registry functions as the full entries: an extension
 * that imports from here runs under a Canvas created by any other entry. (That it stays three-free
 * and small is checked against the built files by scripts/verify-bundles.js.)
 */
import * as extension from '../src/extension'
import * as core from '../src'
import { context as storeContext } from '../src/core/store'

describe('@react-three/fiber/extension', () => {
  it('exports exactly the extension surface', () => {
    expect(Object.keys(extension).sort()).toEqual(
      ['context', 'registerRootExtension', 'setRenderOverride', 'useFrame', 'useStore', 'useThree'].sort(),
    )
  })

  it('shares its bindings with the full entry', () => {
    expect(extension.context).toBe(storeContext)
    expect(extension.useStore).toBe(core.useStore)
    expect(extension.useThree).toBe(core.useThree)
    expect(extension.useFrame).toBe(core.useFrame)
    expect(extension.registerRootExtension).toBe(core.registerRootExtension)
    expect(extension.setRenderOverride).toBe(core.setRenderOverride)
  })
})
