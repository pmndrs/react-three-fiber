//* Scheduler Types (useFrame) ==============================

import type { RootState, Frameloop } from './store'

// Public Options --------------------------------

/**
 * Options for useFrame hook
 */
export interface UseFrameNextOptions {
  /** Optional stable id for the job. Auto-generated if not provided */
  id?: string
  /** Named phase to run in. Default: 'update' */
  phase?: string
  /** Run before this phase or job id */
  before?: string | string[]
  /** Run after this phase or job id */
  after?: string | string[]
  /** Priority within phase. Higher runs first. Default: 0 */
  priority?: number
  /** Max frames per second for this job */
  fps?: number
  /** If true, skip frames when behind. If false, try to catch up. Default: true */
  drop?: boolean
  /** Enable/disable without unregistering. Default: true */
  enabled?: boolean
}

/** Alias for UseFrameNextOptions */
export type UseFrameOptions = UseFrameNextOptions

/**
 * Options for addPhase
 */
export interface AddPhaseOptions {
  /** Insert this phase before the specified phase */
  before?: string
  /** Insert this phase after the specified phase */
  after?: string
}

// Frame State --------------------------------

/**
 * Timing-only state for independent/outside mode (no RootState)
 */
export interface FrameTimingState {
  /** High-resolution timestamp from RAF (ms) */
  time: number
  /** Time since last frame in seconds (for legacy compatibility with THREE.Clock) */
  delta: number
  /** Elapsed time since first frame in seconds (for legacy compatibility with THREE.Clock) */
  elapsed: number
  /** Incrementing frame counter */
  frame: number
}

/**
 * State passed to useFrame callbacks (extends RootState with timing)
 */
export interface FrameNextState extends RootState, FrameTimingState {}

/** Alias for FrameNextState */
export type FrameState = FrameNextState

// Root Options --------------------------------

/**
 * Options for registerRoot
 */
export interface RootOptions {
  /** State provider for callbacks. Optional in independent mode. */
  getState?: () => any
  /** Error handler for job errors. Falls back to console.error if not provided. */
  onError?: (error: Error) => void
}

// Callback Types --------------------------------

/**
 * Callback function for useFrame
 */
export type FrameNextCallback = (state: FrameNextState, delta: number) => void

/** Alias for FrameNextCallback */
export type FrameCallback = FrameNextCallback

// Controls returned from useFrame --------------------------------

/**
 * Controls object returned from useFrame hook
 */
export interface FrameNextControls {
  /** The job's unique ID */
  id: string
  /** Access to the global scheduler for frame loop control */
  scheduler: SchedulerApi
  /** Manually step this job only (bypasses FPS limiting) */
  step(timestamp?: number): void
  /** Manually step ALL jobs in the scheduler */
  stepAll(timestamp?: number): void
  /** Pause this job (set enabled=false) */
  pause(): void
  /** Resume this job (set enabled=true) */
  resume(): void
  /** Reactive paused state - automatically triggers re-render when changed */
  isPaused: boolean
}

/** Alias for FrameNextControls */
export type FrameControls = FrameNextControls

// Scheduler Interface --------------------------------

/**
 * Public interface for the global Scheduler
 */
export interface SchedulerApi {
  //* Phase Management --------------------------------

  /** Add a named phase to the scheduler */
  addPhase(name: string, options?: AddPhaseOptions): void
  /** Get the ordered list of phase names */
  readonly phases: string[]
  /** Check if a phase exists */
  hasPhase(name: string): boolean

  //* Root Management --------------------------------

  /** Register a root (Canvas) with the scheduler. Returns unsubscribe function. */
  registerRoot(id: string, options?: RootOptions): () => void
  /** Unregister a root */
  unregisterRoot(id: string): void
  /** Generate a unique root ID */
  generateRootId(): string
  /** Get the number of registered roots */
  getRootCount(): number
  /** Check if any root is registered and ready */
  readonly isReady: boolean
  /** Subscribe to root-ready event. Fires immediately if already ready. Returns unsubscribe. */
  onRootReady(callback: () => void): () => void

  //* Job Registration --------------------------------

  /** Register a job with the scheduler (returns unsubscribe function) */
  register(
    callback: FrameNextCallback,
    options?: {
      id?: string
      rootId?: string
      phase?: string
      before?: string | string[]
      after?: string | string[]
      priority?: number
      fps?: number
      drop?: boolean
      enabled?: boolean
    },
  ): () => void
  /** Update a job's options */
  updateJob(
    id: string,
    options: {
      priority?: number
      fps?: number
      drop?: boolean
      enabled?: boolean
      phase?: string
      before?: string | string[]
      after?: string | string[]
    },
  ): void
  /** Unregister a job by ID */
  unregister(id: string, rootId?: string): void
  /** Get the number of registered jobs */
  getJobCount(): number
  /** Get all job IDs */
  getJobIds(): string[]

  //* Global Jobs (for legacy addEffect/addAfterEffect) --------------------------------

  /** Register a global job (runs once per frame, not per-root). Returns unsubscribe function. */
  registerGlobal(phase: 'before' | 'after', id: string, callback: (timestamp: number) => void): () => void

  //* Idle Callbacks (for legacy addTail) --------------------------------

  /** Register an idle callback (fires when loop stops). Returns unsubscribe function. */
  onIdle(callback: (timestamp: number) => void): () => void

  //* Frame Loop Control --------------------------------

  /** Start the scheduler loop */
  start(): void
  /** Stop the scheduler loop */
  stop(): void
  /** Check if the scheduler is running */
  readonly isRunning: boolean
  /** Get/set the frameloop mode ('always', 'demand', 'never') */
  frameloop: Frameloop
  /** Independent mode - runs without Canvas, callbacks receive timing-only state */
  independent: boolean

  //* Manual Stepping --------------------------------

  /** Manually step all jobs once (for frameloop='never' or testing) */
  step(timestamp?: number): void
  /** Manually step a single job by ID */
  stepJob(id: string, timestamp?: number): void
  /** Request frame(s) to be rendered (for frameloop='demand') */
  invalidate(frames?: number): void

  //* Per-Job Control --------------------------------

  /** Check if a job is paused */
  isJobPaused(id: string): boolean
  /** Pause a job */
  pauseJob(id: string): void
  /** Resume a job */
  resumeJob(id: string): void
  /** Subscribe to job state changes (for reactive isPaused). Returns unsubscribe function. */
  subscribeJobState(id: string, listener: () => void): () => void
}
