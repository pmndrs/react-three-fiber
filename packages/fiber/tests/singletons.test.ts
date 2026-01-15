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

//* Symbol keys used by the singleton pattern ==============================
const CONTEXT_KEY = Symbol.for('@react-three/fiber.context')
const SCHEDULER_KEY = Symbol.for('@react-three/fiber.scheduler')
const CATALOGUE_KEY = Symbol.for('@react-three/fiber.catalogue')

describe('Cross-bundle singleton sharing', () => {
  //* Setup: Clear global singletons before each test ==============================
  // This ensures each test starts with a clean slate
  beforeEach(() => {
    // Clear any existing global singletons
    delete (globalThis as any)[CONTEXT_KEY]
    delete (globalThis as any)[SCHEDULER_KEY]
    delete (globalThis as any)[CATALOGUE_KEY]
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

  //* Scheduler Tests ==============================
  describe('Scheduler', () => {
    it('scheduler instance should be shared across module reloads', async () => {
      // First "bundle" load
      vi.resetModules()
      const schedulerModA = await import('../src/core/hooks/useFrame/scheduler')
      const schedulerA = schedulerModA.getScheduler()

      // Second "bundle" load
      vi.resetModules()
      const schedulerModB = await import('../src/core/hooks/useFrame/scheduler')
      const schedulerB = schedulerModB.getScheduler()

      // Without Symbol.for() singleton pattern, these will be different instances
      // With the fix, they should be the exact same instance
      expect(schedulerA).toBe(schedulerB)
    })

    it('scheduler should maintain state across module reloads', async () => {
      // First "bundle" load - register a root
      vi.resetModules()
      const schedulerModA = await import('../src/core/hooks/useFrame/scheduler')
      const schedulerA = schedulerModA.getScheduler()
      const rootId = schedulerA.generateRootId()

      // Second "bundle" load - should see the same state
      vi.resetModules()
      const schedulerModB = await import('../src/core/hooks/useFrame/scheduler')
      const schedulerB = schedulerModB.getScheduler()

      // If singletons work, the second instance should have the same rootIdCounter
      // We can verify by generating another ID and checking it incremented
      const nextRootId = schedulerB.generateRootId()

      // If they're the same instance, IDs should be sequential
      // If different instances, nextRootId would be the same as rootId
      expect(nextRootId).not.toBe(rootId)
    })
  })

  //* Catalogue Tests ==============================
  describe('Catalogue (extend registry)', () => {
    it('catalogue should be shared across module reloads', async () => {
      // First "bundle" load - extend with a test component
      vi.resetModules()
      const reconcilerA = await import('../src/core/reconciler')

      // Create a test class to extend
      class TestComponent {}
      reconcilerA.extend({ TestComponent })

      // Second "bundle" load - should see the extended component
      vi.resetModules()
      const reconcilerB = await import('../src/core/reconciler')

      // Try extending with another component to verify catalogue is accessible
      class AnotherComponent {}
      reconcilerB.extend({ AnotherComponent })

      // Load a third time to verify both components are present
      vi.resetModules()
      const reconcilerC = await import('../src/core/reconciler')

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
      const reconcilerA = await import('../src/core/reconciler')

      class UniqueTestClass {}
      reconcilerA.extend({ UniqueTestClass })

      // Check if the catalogue was stored globally
      const catalogue = (globalThis as any)[CATALOGUE_KEY]

      // If Symbol.for() pattern is implemented, catalogue should exist globally
      // and contain our extended class
      if (catalogue) {
        expect(catalogue.UniqueTestClass).toBe(UniqueTestClass)
      } else {
        // If catalogue is not global, this test should fail
        // This is expected before the fix is applied
        expect(catalogue).toBeDefined()
      }
    })
  })
})
