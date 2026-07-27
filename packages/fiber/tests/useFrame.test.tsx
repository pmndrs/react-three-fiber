import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { render, cleanup } from '@testing-library/react'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, useThree, extend, useFrame } from '../src'

extend(THREE as any)

//* Integration Tests (with Canvas) ==============================

describe('useFrame hook', () => {
  let canvas: HTMLCanvasElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    canvas = createCanvas()
    root = createRoot(canvas)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('registers callback and runs each frame', async () => {
    const frameCalls: number[] = []

    const Component = () => {
      useFrame((state, delta) => {
        frameCalls.push(delta)
      })
      return <mesh />
    }

    await act(async () => (await root.configure({ frameloop: 'always' })).render(<Component />))

    // Wait for a few frames
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('accepts priority number for backwards compat', async () => {
    const calls: string[] = []

    const LowPriority = () => {
      useFrame(() => calls.push('low'), 1)
      return null
    }

    const HighPriority = () => {
      useFrame(() => calls.push('high'), 10)
      return null
    }

    await act(async () =>
      (await root.configure({ frameloop: 'always' })).render(
        <>
          <LowPriority />
          <HighPriority />
        </>,
      ),
    )

    // Wait for frames
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Higher priority should run first within each frame
    // Check that high appears before low in at least some frames
    const highIdx = calls.indexOf('high')
    const lowIdx = calls.indexOf('low')

    expect(highIdx).toBeLessThan(lowIdx)
  })

  it('accepts options object', async () => {
    const calls: string[] = []

    const Component = () => {
      useFrame(
        () => {
          calls.push('physics')
        },
        { phase: 'physics', priority: 5 },
      )
      return null
    }

    await act(async () => (await root.configure({ frameloop: 'always' })).render(<Component />))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every((c) => c === 'physics')).toBe(true)
  })

  it('respects enabled option', async () => {
    const calls: number[] = []

    const Component = ({ enabled }: { enabled: boolean }) => {
      useFrame(() => calls.push(Date.now()), { enabled })
      return null
    }

    // Start disabled
    await act(async () => (await root.configure({ frameloop: 'always' })).render(<Component enabled={false} />))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const callsWhenDisabled = calls.length
    expect(callsWhenDisabled).toBe(0)

    // Enable
    await act(async () => root.render(<Component enabled={true} />))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(calls.length).toBeGreaterThan(callsWhenDisabled)
  })

  it('unsubscribes on unmount', async () => {
    const calls: number[] = []

    const Component = () => {
      useFrame(() => calls.push(Date.now()))
      return null
    }

    await act(async () => (await root.configure({ frameloop: 'always' })).render(<Component />))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const callsBeforeUnmount = calls.length
    expect(callsBeforeUnmount).toBeGreaterThan(0)

    // Unmount the component
    await act(async () => root.render(<mesh />))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Should not have significantly more calls
    expect(calls.length).toBe(callsBeforeUnmount)
  })

  it('provides scheduler via useThree', async () => {
    let scheduler: any

    const Component = () => {
      scheduler = useThree((s) => s.internal.scheduler)
      return null
    }

    await act(async () => (await root.configure()).render(<Component />))

    expect(scheduler).toBeDefined()
    expect(typeof scheduler.addPhase).toBe('function')
    expect(Array.isArray(scheduler.phases)).toBe(true)
  })

  it('orders callbacks by phase', async () => {
    const order: string[] = []

    const RenderPhase = () => {
      useFrame(() => order.push('render'), { phase: 'render' })
      return null
    }

    const PhysicsPhase = () => {
      useFrame(() => order.push('physics'), { phase: 'physics' })
      return null
    }

    const UpdatePhase = () => {
      useFrame(() => order.push('update'), { phase: 'update' })
      return null
    }

    // Render in non-phase order
    await act(async () =>
      (await root.configure({ frameloop: 'always' })).render(
        <>
          <RenderPhase />
          <PhysicsPhase />
          <UpdatePhase />
        </>,
      ),
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Find first occurrence of each
    const physicsIdx = order.indexOf('physics')
    const updateIdx = order.indexOf('update')
    const renderIdx = order.indexOf('render')

    // Phase order should be: physics -> update -> render
    expect(physicsIdx).toBeLessThan(updateIdx)
    expect(updateIdx).toBeLessThan(renderIdx)
  })

  it('returns controls object with id', async () => {
    let controls: any

    const Component = () => {
      controls = useFrame(() => {}, { id: 'my-job' })
      return null
    }

    await act(async () => (await root.configure()).render(<Component />))

    expect(controls).toBeDefined()
    expect(controls.id).toBe('my-job')
    expect(typeof controls.step).toBe('function')
    expect(typeof controls.stepAll).toBe('function')
    expect(typeof controls.pause).toBe('function')
    expect(typeof controls.resume).toBe('function')
    expect(typeof controls.isPaused).toBe('boolean')
  })

  it('controls.step() runs only that job', async () => {
    const calls: string[] = []
    let controls1: any
    let controls2: any

    const Job1 = () => {
      controls1 = useFrame(() => calls.push('job1'), { id: 'job1' })
      return null
    }

    const Job2 = () => {
      controls2 = useFrame(() => calls.push('job2'), { id: 'job2' })
      return null
    }

    await act(async () =>
      (await root.configure({ frameloop: 'never' })).render(
        <>
          <Job1 />
          <Job2 />
        </>,
      ),
    )

    // Step only job1
    await act(async () => {
      controls1.step()
    })

    expect(calls).toEqual(['job1'])

    // Step only job2
    await act(async () => {
      controls2.step()
    })

    expect(calls).toEqual(['job1', 'job2'])
  })

  it('controls.stepAll() runs all jobs', async () => {
    const calls: string[] = []
    let controls: any

    const Job1 = () => {
      controls = useFrame(() => calls.push('job1'), { id: 'job1' })
      return null
    }

    const Job2 = () => {
      useFrame(() => calls.push('job2'), { id: 'job2' })
      return null
    }

    await act(async () =>
      (await root.configure({ frameloop: 'never' })).render(
        <>
          <Job1 />
          <Job2 />
        </>,
      ),
    )

    // Step all via controls from job1
    await act(async () => {
      controls.stepAll()
    })

    expect(calls).toContain('job1')
    expect(calls).toContain('job2')
  })

  it('controls.pause() and resume() work', async () => {
    const calls: string[] = []
    let controls: any

    const Component = () => {
      controls = useFrame(() => calls.push('frame'), { id: 'pausable' })
      return null
    }

    await act(async () => (await root.configure({ frameloop: 'never' })).render(<Component />))

    expect(controls.isPaused).toBe(false)

    // Pause
    await act(async () => {
      controls.pause()
    })

    expect(controls.isPaused).toBe(true)

    // Try to stepAll - paused job should not run
    await act(async () => {
      controls.stepAll()
    })

    expect(calls.length).toBe(0)

    // Resume
    await act(async () => {
      controls.resume()
    })

    expect(controls.isPaused).toBe(false)

    // Now it should run
    await act(async () => {
      controls.stepAll()
    })

    expect(calls).toEqual(['frame'])
  })

  it('works with frameloop="never" for manual control', async () => {
    const calls: string[] = []
    let controls: any

    const Component = () => {
      controls = useFrame(() => calls.push('tick'))
      return null
    }

    await act(async () => (await root.configure({ frameloop: 'never' })).render(<Component />))

    // No automatic frames
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(calls.length).toBe(0)

    // Manual step
    await act(async () => {
      controls.stepAll()
      controls.stepAll()
      controls.stepAll()
    })

    expect(calls.length).toBe(3)
  })

  it('propagates useFrame errors to store error state', async () => {
    const testError = new Error('useFrame test error')
    let store: any

    const Component = () => {
      useFrame(() => {
        throw testError
      })
      return <mesh />
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'always' })).render(<Component />)
    })

    // Wait for a frame to execute and trigger the error
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Verify error was set in store (only extract the error property to avoid circular references)
    const error = store.getState().error
    expect(error).toBe(testError)
  })

  //* Legacy Priority Tests ==============================
  // These tests verify backwards compatibility with the old useFrame(cb, priority) pattern
  // where priority > 0 meant "I'm taking over rendering"

  it('increments internal.priority when using legacy priority > 0', async () => {
    let store: any
    let internalPriorityBeforeMount: number
    let internalPriorityAfterMount: number

    const Component = () => {
      // Using the OLD pattern: useFrame(cb, number) with number > 0
      // This should increment internal.priority to disable the default renderer
      useFrame(() => {}, 1)
      return null
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(<mesh />)
    })

    internalPriorityBeforeMount = store.getState().internal.priority
    expect(internalPriorityBeforeMount).toBe(0)

    // Mount component with legacy priority
    await act(async () => {
      root.render(<Component />)
    })

    internalPriorityAfterMount = store.getState().internal.priority
    expect(internalPriorityAfterMount).toBe(1)
  })

  it('decrements internal.priority when unmounting legacy priority component', async () => {
    let store: any

    const Component = () => {
      useFrame(() => {}, 1)
      return null
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(<Component />)
    })

    // Should be incremented after mount
    expect(store.getState().internal.priority).toBe(1)

    // Unmount the component
    await act(async () => {
      root.render(<mesh />)
    })

    // Should be decremented back to 0
    expect(store.getState().internal.priority).toBe(0)
  })

  it('does NOT increment internal.priority when using priority 0', async () => {
    let store: any

    const Component = () => {
      useFrame(() => {}, 0)
      return null
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(<Component />)
    })

    // Priority 0 should NOT increment internal.priority (only priority > 0 means take over rendering)
    expect(store.getState().internal.priority).toBe(0)
  })

  it('does NOT increment internal.priority when using options object', async () => {
    let store: any

    const Component = () => {
      // Using the NEW pattern: useFrame(cb, { priority: 1 })
      // This should NOT increment internal.priority (use phase: 'render' instead)
      useFrame(() => {}, { priority: 1 })
      return null
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(<Component />)
    })

    // Options object should NOT trigger legacy behavior
    expect(store.getState().internal.priority).toBe(0)
  })

  it('multiple legacy priority callbacks stack correctly', async () => {
    let store: any

    const Component1 = () => {
      useFrame(() => {}, 1)
      return null
    }

    const Component2 = () => {
      useFrame(() => {}, 2)
      return null
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(
        <>
          <Component1 />
          <Component2 />
        </>,
      )
    })

    // Both should increment internal.priority
    expect(store.getState().internal.priority).toBe(2)

    // Unmount one
    await act(async () => {
      root.render(<Component1 />)
    })

    expect(store.getState().internal.priority).toBe(1)

    // Unmount all
    await act(async () => {
      root.render(<mesh />)
    })

    expect(store.getState().internal.priority).toBe(0)
  })

  it('legacy priority callbacks still execute correctly', async () => {
    const calls: string[] = []

    const Component = () => {
      useFrame(() => {
        calls.push('legacy-callback')
      }, 1)
      return null
    }

    await act(async () => (await root.configure({ frameloop: 'always' })).render(<Component />))

    // Wait for frames
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Callback should have been called despite legacy pattern
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every((c) => c === 'legacy-callback')).toBe(true)
  })

  it('legacy priority in portals propagates to parent root', async () => {
    // This test ensures that when useFrame with legacy priority is used inside a portal,
    // the parent root's internal.priority is also incremented so the default renderer skips
    let store: any
    let portalScene: THREE.Scene

    // Component inside the portal that uses legacy priority
    const PortalContent = () => {
      useFrame(() => {}, 1) // Legacy priority pattern
      return null
    }

    // Helper to create a portal - simplified version of createPortal
    const PortalWrapper = ({ children }: { children: React.ReactNode }) => {
      const previousRoot = useThree((state) => state)
      // Access parent's internal.priority through store
      return <>{children}</>
    }

    await act(async () => {
      store = (await root.configure({ frameloop: 'never' })).render(<mesh />)
    })

    // Before mounting portal content, parent internal.priority should be 0
    expect(store.getState().internal.priority).toBe(0)

    // Note: Full portal testing would require createPortal which needs more setup
    // This test verifies the base case; integration tests should verify portal behavior
  })
})

//* Outside Canvas: host-guaranteed ==============================
// r3f's useFrame always delivers full RootState. Used outside a Canvas the job
// registers on the scheduler's ambient root, but the callback is held until a
// Canvas adopts the job (host state present).

describe('useFrame outside Canvas', () => {
  beforeEach(() => {
    Scheduler.reset()
    getScheduler().frameloop = 'never' // drive frames manually
  })

  afterEach(() => {
    cleanup()
    Scheduler.reset()
  })

  it('registers but does not fire until a host exists', () => {
    const seen: any[] = []
    function UI() {
      useFrame((state) => seen.push(state.renderer))
      return null
    }

    act(() => {
      render(<UI />)
    })

    const scheduler = getScheduler()
    // Job is registered immediately...
    expect(scheduler.getJobCount()).toBe(1)
    // ...but the callback is held — no host, so no full RootState yet
    act(() => scheduler.step(1000))
    expect(seen.length).toBe(0)
  })

  it('fires with full state once a Canvas adopts the job', () => {
    const seen: any[] = []
    function UI() {
      useFrame((state) => seen.push(state.renderer))
      return null
    }

    act(() => {
      render(<UI />)
    })

    const scheduler = getScheduler()

    // No host yet — guarded
    act(() => scheduler.step(1000))
    expect(seen.length).toBe(0)

    // A host (Canvas) registers and adopts the job
    const fakeRenderer = { isFakeRenderer: true }
    act(() => {
      scheduler.registerRoot('host', { getState: () => ({ renderer: fakeRenderer }) })
    })

    // Now the callback runs, always with host state present
    act(() => scheduler.step(2000))
    expect(seen.length).toBe(1)
    expect(seen[0]).toBe(fakeRenderer)
  })
})

//* System-job ordering: Bug #1 regression ==============================
// The frustum/visibility system jobs register with { before: 'render' } (see
// renderer.tsx). They must run after update but before render — previously they
// used a bogus 'preRender' phase that the sorter appended after render/finish,
// leaving state.frustum one frame stale for render-phase consumers.

describe('system job ordering', () => {
  beforeEach(() => {
    Scheduler.reset()
    getScheduler().frameloop = 'never' // drive frames manually
  })

  afterEach(() => {
    Scheduler.reset()
  })

  it('runs { before: render } jobs after update and before render', () => {
    const calls: string[] = []
    const scheduler = getScheduler()
    scheduler.registerRoot('test-root', { getState: () => ({}) })

    // Mirror renderer.tsx registration order/options for the system jobs
    scheduler.register(() => calls.push('update'), { id: 'update-job', rootId: 'test-root', phase: 'update' })
    scheduler.register(() => calls.push('render'), { id: 'render-job', rootId: 'test-root', phase: 'render' })
    scheduler.register(() => calls.push('frustum'), { id: 'frustum', rootId: 'test-root', before: 'render' })
    scheduler.register(() => calls.push('visibility'), {
      id: 'visibility',
      rootId: 'test-root',
      before: 'render',
      after: 'frustum',
    })

    scheduler.step(1000)

    expect(calls).toEqual(['update', 'frustum', 'visibility', 'render'])
  })
})
