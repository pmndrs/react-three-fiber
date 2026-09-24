/**
 * @fileoverview Tests for cross-bundle singleton sharing
 *
 * These tests verify that critical singletons (context, scheduler, catalogue)
 * are shared across module reloads, which simulates what happens when users
 * mix imports from different R3F entry points (e.g., @react-three/fiber and
 * @react-three/fiber/webgpu).
 *
 * The `vi.resetModules()` call clears the module cache, forcing fresh imports.
 * This simulates the scenario where two separate bundles each load their own
 * copy of the same module.
 *
 * Without the Symbol.for() singleton pattern, each reload creates new instances,
 * breaking cross-bundle interoperability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

//* Symbol keys used by the singleton pattern ==============================
const CONTEXT_KEY = Symbol.for('@react-three/fiber.context')
const CATALOGUE_KEY = Symbol.for('@react-three/fiber.catalogue')
const EXTEND_ID_KEY = Symbol.for('@react-three/fiber.extendId')

describe('Cross-bundle singleton sharing', () => {
  //* Setup: Clear global singletons before each test ==============================
  // This ensures each test starts with a clean slate
  beforeEach(() => {
    // Clear any existing global singletons
    delete (globalThis as any)[CONTEXT_KEY]
    delete (globalThis as any)[CATALOGUE_KEY]
    delete (globalThis as any)[EXTEND_ID_KEY]
  })

  //* Context Tests ==============================
  describe('React Context', () => {
    it('context should be the same object across module reloads (simulating multiple bundles)', async () => {
      // First "bundle" load
      vi.resetModules()
      const storeA = await import('../src/core/store')
      const contextA = storeA.context

      // Second "bundle" load (simulates @react-three/fiber/webgpu importing same module)
      vi.resetModules()
      const storeB = await import('../src/core/store')
      const contextB = storeB.context

      // Without Symbol.for() singleton pattern, these will be different objects
      // With the fix, they should be the exact same object reference
      expect(contextA).toBe(contextB)
    })
  })

  // Note: the scheduler singleton is now owned by @pmndrs/scheduler and is
  // covered by that package's own cross-bundle tests.

  //* Catalogue Tests ==============================
  describe('Catalogue (extend registry)', () => {
    it('catalogue should be shared across module reloads', async () => {
      // First "bundle" load - extend with a test component
      vi.resetModules()
      const reconcilerA = await import('../src/core/extend')

      // Create a test class to extend
      class TestComponent {}
      reconcilerA.extend({ TestComponent })

      // Second "bundle" load - should see the extended component
      vi.resetModules()
      const reconcilerB = await import('../src/core/extend')

      // Try extending with another component to verify catalogue is accessible
      class AnotherComponent {}
      reconcilerB.extend({ AnotherComponent })

      // Load a third time to verify both components are present
      vi.resetModules()
      const reconcilerC = await import('../src/core/extend')

      // If catalogue is shared, extending from any bundle should work globally
      // We can't directly access catalogue (it's not exported), but we can verify
      // by checking that extend doesn't throw and the module loads correctly
      expect(reconcilerC.extend).toBeDefined()

      // The real test is that if we had JSX rendering, components extended from
      // bundle A would be available when rendering from bundle B
    })

    it('extend from one bundle should be visible to another bundle', async () => {
      // This is a more direct test - we need to verify the catalogue object itself
      // Since catalogue isn't exported, we'll check via the global symbol

      // First "bundle" load - extend with a test component
      vi.resetModules()
      const reconcilerA = await import('../src/core/extend')

      class UniqueTestClass {}
      reconcilerA.extend({ UniqueTestClass })

      // Check if the catalogue was stored globally
      const catalogue = (globalThis as any)[CATALOGUE_KEY]

      // If Symbol.for() pattern is implemented, catalogue should exist globally
      // and contain our extended class
      if (catalogue) {
        expect(catalogue.UniqueTestClass).toBe(UniqueTestClass)
      } else {
        expect(catalogue).toBeDefined()
      }
    })

    it('factory extend() ids never collide across bundles', async () => {
      // Generated element IDs must remain unique across module instances.
      vi.resetModules()
      const reconcilerA = await import('../src/core/extend')
      class FromBundleA {}
      const idA = reconcilerA.extend(FromBundleA) as unknown as string

      vi.resetModules()
      const reconcilerB = await import('../src/core/extend')
      class FromBundleB {}
      const idB = reconcilerB.extend(FromBundleB) as unknown as string

      expect(idA).not.toBe(idB)
      const catalogue = (globalThis as any)[CATALOGUE_KEY]
      expect(catalogue[idA]).toBe(FromBundleA)
      expect(catalogue[idB]).toBe(FromBundleB)
    })

    it('factory extend() skips catalogue ids a pre-shared-counter bundle already took', async () => {
      // A copy of R3F from before the shared counter (v10 alphas) keeps a module-local `let i = 0`
      // and writes `catalogue['0']` without ever touching EXTEND_ID. Simulate that bundle by seeding
      // the shared catalogue directly, then check the current extend() lands on the next free slot.
      vi.resetModules()
      const current = await import('../src/core/extend')
      const catalogue = (globalThis as any)[CATALOGUE_KEY]

      class FromOldBundle {}
      catalogue['0'] = FromOldBundle
      expect((globalThis as any)[EXTEND_ID_KEY]).toBeUndefined()

      class FromNewBundle {}
      const id = current.extend(FromNewBundle) as unknown as string

      expect(id).toBe('1')
      expect(catalogue['0']).toBe(FromOldBundle)
      expect(catalogue['1']).toBe(FromNewBundle)
      expect((globalThis as any)[EXTEND_ID_KEY]).toBe(2)
    })

    it('a reconciler from bundle B instantiates the class bundle A registered with extend()', async () => {
      // Regression for the pre-fix failure mode: each bundle counted from 0, so bundle B's factory
      // id overwrote bundle A's slot and rendering A's element constructed B's class. Go through
      // the real reconciler (createInstance) rather than only inspecting catalogue slots.
      class FromBundleA extends THREE.Object3D {}
      class FromBundleB extends THREE.Object3D {}

      vi.resetModules()
      const bundleA = await import('../src/core/extend')
      const ElementA = bundleA.extend(FromBundleA)

      vi.resetModules()
      const bundleB = await import('../src/index')
      const ElementB = bundleB.extend(FromBundleB)

      const root = bundleB.createRoot(document.createElement('canvas'))
      try {
        const store = await act(async () =>
          root.render(
            React.createElement(
              React.Fragment,
              null,
              React.createElement(ElementA, { name: 'a' }),
              React.createElement(ElementB, { name: 'b' }),
            ),
          ),
        )
        const { scene } = store.getState()
        expect(scene.getObjectByName('a')).toBeInstanceOf(FromBundleA)
        expect(scene.getObjectByName('b')).toBeInstanceOf(FromBundleB)
      } finally {
        await act(async () => root.unmount())
      }
    })
  })
})
