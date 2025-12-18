import * as React from 'react'
import * as THREE from 'three'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { createRoot, act, useThree, extend, useFrame } from '../src'
import { Scheduler } from '../src/core/hooks/useFrame/scheduler'
import { PhaseGraph } from '../src/core/hooks/useFrame/phaseGraph'
import { rebuildSortedJobs } from '../src/core/hooks/useFrame/sorter'
import { shouldRun } from '../src/core/hooks/useFrame/rateLimiter'
import type { FrameCallback } from '../src'

extend(THREE as any)

//* PhaseGraph Tests ==============================

describe('PhaseGraph', () => {
  it('initializes with default phases', () => {
    const graph = new PhaseGraph()
    const phases = graph.getOrderedPhases()

    expect(phases).toEqual(['start', 'input', 'physics', 'update', 'render', 'finish'])
  })

  it('adds phase before another phase', () => {
    const graph = new PhaseGraph()
    graph.addPhase('clouds', { before: 'render' })
    const phases = graph.getOrderedPhases()

    expect(phases).toEqual(['start', 'input', 'physics', 'update', 'clouds', 'render', 'finish'])
  })

  it('adds phase after another phase', () => {
    const graph = new PhaseGraph()
    graph.addPhase('postFx', { after: 'render' })
    const phases = graph.getOrderedPhases()

    expect(phases).toEqual(['start', 'input', 'physics', 'update', 'render', 'postFx', 'finish'])
  })

  it('prevents duplicate phases', () => {
    const graph = new PhaseGraph()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    graph.addPhase('update', { before: 'render' })

    expect(warnSpy).toHaveBeenCalledWith('[useFrame] Phase "update" already exists')
    expect(graph.getOrderedPhases().filter((p) => p === 'update').length).toBe(1)

    warnSpy.mockRestore()
  })

  it('resolves constraint phase for before constraint', () => {
    const graph = new PhaseGraph()
    const phase = graph.resolveConstraintPhase('render', undefined)

    expect(phase).toBe('before:render')
    expect(graph.hasPhase('before:render')).toBe(true)
    // Should be inserted before render
    const phases = graph.getOrderedPhases()
    const beforeIdx = phases.indexOf('before:render')
    const renderIdx = phases.indexOf('render')
    expect(beforeIdx).toBeLessThan(renderIdx)
  })

  it('resolves constraint phase for after constraint', () => {
    const graph = new PhaseGraph()
    const phase = graph.resolveConstraintPhase(undefined, 'render')

    expect(phase).toBe('after:render')
    expect(graph.hasPhase('after:render')).toBe(true)
    // Should be inserted after render
    const phases = graph.getOrderedPhases()
    const afterIdx = phases.indexOf('after:render')
    const renderIdx = phases.indexOf('render')
    expect(afterIdx).toBeGreaterThan(renderIdx)
  })

  it('returns update phase when no constraints', () => {
    const graph = new PhaseGraph()
    const phase = graph.resolveConstraintPhase(undefined, undefined)

    expect(phase).toBe('update')
  })

  it('caches ordered phases and invalidates on change', () => {
    const graph = new PhaseGraph()
    const phases1 = graph.getOrderedPhases()
    const phases2 = graph.getOrderedPhases()

    // Should be same reference (cached)
    expect(phases1).toBe(phases2)

    graph.addPhase('newPhase', { before: 'finish' })
    const phases3 = graph.getOrderedPhases()

    // Should be different reference after change
    expect(phases3).not.toBe(phases1)
    expect(phases3).toContain('newPhase')
  })
})

//* Sorter Tests ==============================

describe('rebuildSortedJobs', () => {
  const createJob = (overrides: Partial<Job>): Job => ({
    id: 'test-job',
    callback: jest.fn(),
    phase: 'update',
    before: new Set(),
    after: new Set(),
    priority: 0,
    index: 0,
    drop: true,
    enabled: true,
    ...overrides,
  })

  it('sorts jobs by phase order', () => {
    const graph = new PhaseGraph()
    const jobs = new Map<string, Job>([
      ['job-render', createJob({ id: 'job-render', phase: 'render', index: 0 })],
      ['job-physics', createJob({ id: 'job-physics', phase: 'physics', index: 1 })],
      ['job-update', createJob({ id: 'job-update', phase: 'update', index: 2 })],
    ])

    const sorted = rebuildSortedJobs(jobs, graph)

    expect(sorted.map((j) => j.id)).toEqual(['job-physics', 'job-update', 'job-render'])
  })

  it('sorts jobs by priority within phase (higher first)', () => {
    const graph = new PhaseGraph()
    const jobs = new Map<string, Job>([
      ['job-low', createJob({ id: 'job-low', phase: 'update', priority: 1, index: 0 })],
      ['job-high', createJob({ id: 'job-high', phase: 'update', priority: 10, index: 1 })],
      ['job-mid', createJob({ id: 'job-mid', phase: 'update', priority: 5, index: 2 })],
    ])

    const sorted = rebuildSortedJobs(jobs, graph)

    expect(sorted.map((j) => j.id)).toEqual(['job-high', 'job-mid', 'job-low'])
  })

  it('uses index for tie-breaking when priorities equal', () => {
    const graph = new PhaseGraph()
    const jobs = new Map<string, Job>([
      ['job-c', createJob({ id: 'job-c', phase: 'update', priority: 5, index: 2 })],
      ['job-a', createJob({ id: 'job-a', phase: 'update', priority: 5, index: 0 })],
      ['job-b', createJob({ id: 'job-b', phase: 'update', priority: 5, index: 1 })],
    ])

    const sorted = rebuildSortedJobs(jobs, graph)

    expect(sorted.map((j) => j.id)).toEqual(['job-a', 'job-b', 'job-c'])
  })

  it('excludes disabled jobs', () => {
    const graph = new PhaseGraph()
    const jobs = new Map<string, Job>([
      ['job-enabled', createJob({ id: 'job-enabled', enabled: true, index: 0 })],
      ['job-disabled', createJob({ id: 'job-disabled', enabled: false, index: 1 })],
    ])

    const sorted = rebuildSortedJobs(jobs, graph)

    expect(sorted.map((j) => j.id)).toEqual(['job-enabled'])
  })

  it('handles cross-job constraints with topological sort', () => {
    const graph = new PhaseGraph()
    const jobs = new Map<string, Job>([
      ['job-a', createJob({ id: 'job-a', phase: 'update', after: new Set(['job-b']), index: 0 })],
      ['job-b', createJob({ id: 'job-b', phase: 'update', index: 1 })],
    ])

    const sorted = rebuildSortedJobs(jobs, graph)

    // job-b should come before job-a due to constraint
    const idxA = sorted.findIndex((j) => j.id === 'job-a')
    const idxB = sorted.findIndex((j) => j.id === 'job-b')
    expect(idxB).toBeLessThan(idxA)
  })
})

//* Rate Limiter Tests ==============================

describe('shouldRun (rate limiter)', () => {
  const createJob = (overrides: Partial<Job>): Job => ({
    id: 'test-job',
    callback: jest.fn(),
    phase: 'update',
    before: new Set(),
    after: new Set(),
    priority: 0,
    index: 0,
    drop: true,
    enabled: true,
    ...overrides,
  })

  it('returns true when no FPS limit', () => {
    const job = createJob({})
    expect(shouldRun(job, 1000)).toBe(true)
  })

  it('returns false when disabled', () => {
    const job = createJob({ enabled: false })
    expect(shouldRun(job, 1000)).toBe(false)
  })

  it('returns false when not enough time has passed', () => {
    const job = createJob({ fps: 30, lastRun: 1000 })
    // 30 FPS = ~33.3ms interval, only 10ms passed
    expect(shouldRun(job, 1010)).toBe(false)
  })

  it('returns true and updates lastRun when interval passed', () => {
    const job = createJob({ fps: 30, lastRun: 1000 })
    // 30 FPS = ~33.3ms interval, 50ms passed
    const result = shouldRun(job, 1050)

    expect(result).toBe(true)
    expect(job.lastRun).toBeDefined()
  })

  it('uses drop semantics when drop=true', () => {
    const job = createJob({ fps: 30, lastRun: 1000, drop: true })
    const now = 1100 // 100ms passed (missed ~2 frames)

    shouldRun(job, now)

    // With drop=true, lastRun snaps to now
    expect(job.lastRun).toBe(now)
  })

  it('uses catch-up semantics when drop=false', () => {
    const job = createJob({ fps: 30, lastRun: 1000, drop: false })
    const now = 1100 // 100ms passed (missed ~2 frames)

    shouldRun(job, now)

    // With drop=false, lastRun advances by interval steps
    // Interval is ~33.3ms, so 3 steps = ~100ms
    expect(job.lastRun).toBeGreaterThan(1000)
    expect(job.lastRun).toBeLessThanOrEqual(now)
  })
})

//* Scheduler Tests ==============================

describe('Scheduler', () => {
  let scheduler: Scheduler
  let unregisterRoot: () => void

  // Mock R3F state for testing
  const mockState = {
    clock: { getDelta: () => 0.016 },
    scene: {},
    camera: {},
    internal: { scheduler: null },
  } as any

  beforeEach(() => {
    // Reset singleton and get fresh scheduler
    Scheduler.reset()
    scheduler = Scheduler.get()
    // Set to never mode so loop doesn't auto-start
    scheduler.frameloop = 'never'
    // Register a mock root so jobs have somewhere to live
    unregisterRoot = scheduler.registerRoot('test-root', () => mockState)
  })

  afterEach(() => {
    unregisterRoot()
    Scheduler.reset()
  })

  it('registers and unregisters jobs', () => {
    const cb = jest.fn()
    const unsubscribe = scheduler.register(cb, { id: 'test-job', rootId: 'test-root' })

    expect(scheduler.getJobCount()).toBe(1)
    expect(scheduler.getJobIds()).toContain('test-job')

    unsubscribe()

    expect(scheduler.getJobCount()).toBe(0)
  })

  it('generates IDs when not provided', () => {
    const cb = jest.fn()
    scheduler.register(cb, { rootId: 'test-root' })

    expect(scheduler.getJobCount()).toBe(1)
    expect(scheduler.getJobIds()[0]).toMatch(/^job_\d+$/)
  })

  it('exposes addPhase API', () => {
    scheduler.addPhase('custom', { before: 'render' })

    expect(scheduler.hasPhase('custom')).toBe(true)
    expect(scheduler.phases).toContain('custom')
  })

  it('starts and stops the loop', () => {
    expect(scheduler.isRunning).toBe(false)

    scheduler.start()
    expect(scheduler.isRunning).toBe(true)

    scheduler.stop()
    expect(scheduler.isRunning).toBe(false)
  })

  it('updates job options', () => {
    const cb = jest.fn()
    scheduler.register(cb, { id: 'test-job', rootId: 'test-root', priority: 1 })

    scheduler.updateJob('test-job', { priority: 10, enabled: false })

    // Job should be updated (we can't directly access the job, but it should not throw)
    expect(scheduler.getJobCount()).toBe(1)
  })

  it('handles duplicate IDs with warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    scheduler.register(jest.fn(), { id: 'dupe', rootId: 'test-root' })
    scheduler.register(jest.fn(), { id: 'dupe', rootId: 'test-root' })

    expect(warnSpy).toHaveBeenCalledWith('[useFrame] Job with id "dupe" already exists, replacing')
    expect(scheduler.getJobCount()).toBe(1)

    warnSpy.mockRestore()
  })

  it('supports manual step() for all jobs', () => {
    const calls: string[] = []

    scheduler.register(() => calls.push('job1'), { id: 'job1', rootId: 'test-root' })
    scheduler.register(() => calls.push('job2'), { id: 'job2', rootId: 'test-root' })

    // No automatic loop started
    expect(scheduler.isRunning).toBe(false)
    expect(calls.length).toBe(0)

    // Manual step
    scheduler.step()
    expect(calls).toEqual(['job1', 'job2'])

    // Step again
    scheduler.step()
    expect(calls).toEqual(['job1', 'job2', 'job1', 'job2'])
  })

  it('supports stepJob() for a single job', () => {
    const calls: string[] = []

    scheduler.register(() => calls.push('job1'), { id: 'job1', rootId: 'test-root' })
    scheduler.register(() => calls.push('job2'), { id: 'job2', rootId: 'test-root' })

    // Step only job1
    scheduler.stepJob('job1')
    expect(calls).toEqual(['job1'])

    // Step only job2
    scheduler.stepJob('job2')
    expect(calls).toEqual(['job1', 'job2'])
  })

  it('supports pauseJob() and resumeJob()', () => {
    const calls: string[] = []

    scheduler.register(() => calls.push('job1'), { id: 'job1', rootId: 'test-root' })

    expect(scheduler.isJobPaused('job1')).toBe(false)

    scheduler.pauseJob('job1')
    expect(scheduler.isJobPaused('job1')).toBe(true)

    // Paused job should not run on step
    scheduler.step()
    expect(calls.length).toBe(0)

    scheduler.resumeJob('job1')
    expect(scheduler.isJobPaused('job1')).toBe(false)

    scheduler.step()
    expect(calls).toEqual(['job1'])
  })

  it('supports frameloop getter/setter', () => {
    // With a root registered, frameloop defaults to 'never' until set
    scheduler.frameloop = 'never'
    expect(scheduler.frameloop).toBe('never')
    expect(scheduler.isRunning).toBe(false)

    scheduler.frameloop = 'always'
    expect(scheduler.frameloop).toBe('always')
    expect(scheduler.isRunning).toBe(true)

    scheduler.frameloop = 'demand'
    expect(scheduler.frameloop).toBe('demand')
    expect(scheduler.isRunning).toBe(false)
  })

  it('supports invalidate() for demand mode', async () => {
    const calls: string[] = []

    scheduler.frameloop = 'demand'
    scheduler.register(() => calls.push('frame'), { id: 'job', rootId: 'test-root' })

    expect(calls.length).toBe(0)
    expect(scheduler.isRunning).toBe(false)

    // Invalidate should start the loop
    scheduler.invalidate()
    expect(scheduler.isRunning).toBe(true)

    // Wait for frame to execute
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(calls.length).toBeGreaterThan(0)
    // Should have stopped after running the requested frame(s)
    expect(scheduler.isRunning).toBe(false)
  })
})

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
      (
        await root.configure({ frameloop: 'always' })
      ).render(
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
      (
        await root.configure({ frameloop: 'always' })
      ).render(
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
      (
        await root.configure({ frameloop: 'never' })
      ).render(
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
      (
        await root.configure({ frameloop: 'never' })
      ).render(
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
})
