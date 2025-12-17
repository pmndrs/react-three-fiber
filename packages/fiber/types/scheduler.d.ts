//* Scheduler Types (useFrameNext) ==============================

import type { RootState, Frameloop } from './store'

// Public Options --------------------------------

/**
 * Options for useFrameNext hook
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
 * State passed to useFrameNext callbacks
 */
export interface FrameNextState extends RootState {
  /** High-resolution timestamp from RAF (ms) */
  time: number
  /** Time since last frame (ms) */
  delta: number
  /** Elapsed time since first frame (ms) */
  elapsed: number
  /** Incrementing frame counter */
  frame: number
}

// Callback Types --------------------------------

/**
 * Callback function for useFrameNext
 */
export type FrameNextCallback = (state: FrameNextState, delta: number) => void

// Controls returned from useFrameNext --------------------------------

/**
 * Controls object returned from useFrameNext hook
 */
export interface FrameNextControls {
  /** The job's unique ID */
  id: string
  /** Manually step this job only (bypasses FPS limiting) */
  step(timestamp?: number): void
  /** Manually step ALL jobs in the scheduler */
  stepAll(timestamp?: number): void
  /** Pause this job (set enabled=false) */
  pause(): void
  /** Resume this job (set enabled=true) */
  resume(): void
  /** Check if this job is currently paused */
  readonly isPaused: boolean
}

// Scheduler Interface --------------------------------

/**
 * Public interface for the Scheduler (exposed via useThree)
 */
export interface SchedulerApi {
  /** Add a named phase to the scheduler */
  addPhase(name: string, options?: AddPhaseOptions): void
  /** Get the ordered list of phase names */
  readonly phases: string[]
  /** Check if a phase exists */
  hasPhase(name: string): boolean
  /** Register a job with the scheduler (returns unsubscribe function) */
  register(
    callback: FrameNextCallback,
    options?: {
      id?: string
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
  unregister(id: string): void
  /** Start the scheduler loop */
  start(): void
  /** Stop the scheduler loop */
  stop(): void
  /** Check if the scheduler is running */
  readonly isRunning: boolean
  /** Get the number of registered jobs */
  getJobCount(): number
  /** Get all job IDs */
  getJobIds(): string[]

  // Manual stepping --------------------------------

  /** Manually step all jobs once (for frameloop='never' or testing) */
  step(timestamp?: number): void
  /** Manually step a single job by ID */
  stepJob(id: string, timestamp?: number): void
  /** Request frame(s) to be rendered (for frameloop='demand') */
  invalidate(frames?: number): void

  // Per-job control --------------------------------

  /** Check if a job is paused */
  isJobPaused(id: string): boolean
  /** Pause a job */
  pauseJob(id: string): void
  /** Resume a job */
  resumeJob(id: string): void

  // Frameloop mode --------------------------------

  /** Get/set the frameloop mode ('always', 'demand', 'never') */
  frameloop: Frameloop
}
