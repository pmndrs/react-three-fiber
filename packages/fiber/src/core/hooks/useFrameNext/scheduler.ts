//* Scheduler - Core Job Scheduling System ==============================

import type { RootState, AddPhaseOptions, FrameNextState, FrameNextCallback, Frameloop } from '#types'
import { PhaseGraph } from './phaseGraph'
import { rebuildSortedJobs } from './sorter'
import { shouldRun, resetJobTiming } from './rateLimiter'

/**
 * Scheduler manages the frame loop and job execution for a single R3F root.
 *
 * Features:
 * - Dynamic phase system with addPhase()
 * - Priority-based ordering within phases
 * - Before/after constraints (phases or job IDs)
 * - FPS throttling with drop/catch-up semantics
 * - Microtask-batched rebuilds for mount bursts
 * - Manual stepping for frameloop='never' mode
 * - Demand mode support via invalidate()
 */
export class Scheduler {
  // Phase Management --------------------------------
  private phaseGraph: PhaseGraph

  //* Job Registry --------------------------------
  private jobsById: Map<string, Job> = new Map()
  private sortedJobs: Job[] = []
  private needsRebuild: boolean = false
  private rebuildRequested: boolean = false
  private nextIndex: number = 0

  //* Frame Loop --------------------------------
  private loopState: FrameLoopState = {
    running: false,
    rafHandle: null,
    lastTime: 0,
    frameCount: 0,
    elapsedTime: 0,
    createdAt: performance.now(),
  }

  //* Demand Mode --------------------------------
  private pendingFrames: number = 0
  private _frameloop: Frameloop = 'always'

  // R3F State Reference --------------------------------
  private getState: (() => RootState) | null = null

  //* Getters & Setters --------------------------------
  get state(): RootState | null {
    return this.getState?.() ?? null
  }
  set state(state: RootState | null) {
    this.getState = state ? () => state : null
  }

  get frameloop(): Frameloop {
    return this._frameloop
  }

  /**
   * Set the frameloop mode.
   * - 'always': Run continuously
   * - 'demand': Run only when invalidate() is called
   * - 'never': Only run via manual step() calls
   * @param {Frameloop} mode - The frameloop mode to set
   */
  set frameloop(mode: Frameloop) {
    // check if we already are this value.
    if (this._frameloop === mode) return
    const wasAlways = this._frameloop === 'always'
    this._frameloop = mode

    if (mode === 'always' && !this.loopState.running) this.start()
    else if (mode !== 'always' && wasAlways) this.stop()
  }

  get phases(): string[] {
    return this.phaseGraph.getOrderedPhases()
  }

  get isRunning(): boolean {
    return this.loopState.running
  }

  constructor() {
    this.phaseGraph = new PhaseGraph()
    this.loop = this.loop.bind(this)
  }

  //* Initialization --------------------------------

  /**
   * Connect & disconnect the scheduler to the R3F store
   */
  connect(getState: () => RootState): void {
    this.getState = getState
  }
  disconnect(): void {
    this.stop()
    this.getState = null
  }

  //* Phase API --------------------------------

  /**
   * Add a named phase to the scheduler
   */
  addPhase(name: string, options?: AddPhaseOptions): void {
    this.phaseGraph.addPhase(name, options)
    this.requestRebuild()
  }

  /**
   * Check if a phase exists
   */
  hasPhase(name: string): boolean {
    return this.phaseGraph.hasPhase(name)
  }

  //* Job Registration --------------------------------

  /**
   * Register a job with the scheduler
   * @returns unsubscribe function
   */
  register(callback: FrameNextCallback, options: JobOptions = {}): () => void {
    const id = options.id ?? this.generateId()

    // Resolve phase from options
    let phase = options.phase ?? 'update'

    // If before/after specified without explicit phase, resolve via phaseGraph
    if (!options.phase && (options.before || options.after)) {
      phase = this.phaseGraph.resolveConstraintPhase(options.before, options.after)
    }

    // Normalize before/after to Sets
    const before = this.normalizeConstraints(options.before)
    const after = this.normalizeConstraints(options.after)

    const job: Job = {
      id,
      callback,
      phase,
      before,
      after,
      priority: options.priority ?? 0,
      index: this.nextIndex++,
      fps: options.fps,
      drop: options.drop ?? true,
      enabled: options.enabled ?? true,
    }

    // Handle duplicate IDs (last wins)
    if (this.jobsById.has(id)) {
      console.warn(`[useFrameNext] Job with id "${id}" already exists, replacing`)
    }

    this.jobsById.set(id, job)
    this.requestRebuild()

    // Return unsubscribe function
    return () => this.unregister(id)
  }

  /**
   * Unregister a job by ID
   */
  unregister(id: string): void {
    if (this.jobsById.delete(id)) this.requestRebuild()
  }

  /**
   * Update a job's options
   */
  updateJob(id: string, options: Partial<JobOptions>): void {
    const job = this.jobsById.get(id)
    if (!job) return

    // Update mutable fields
    if (options.priority !== undefined) job.priority = options.priority
    if (options.fps !== undefined) job.fps = options.fps
    if (options.drop !== undefined) job.drop = options.drop

    if (options.enabled !== undefined) {
      const wasEnabled = job.enabled
      job.enabled = options.enabled
      // Reset timing when re-enabled
      if (!wasEnabled && job.enabled) resetJobTiming(job)

      // Enabled state affects sortedJobs, so trigger rebuild
      if (wasEnabled !== job.enabled) this.requestRebuild()
    }

    // Phase changes require rebuild
    if (options.phase !== undefined || options.before !== undefined || options.after !== undefined) {
      if (options.phase) job.phase = options.phase
      if (options.before !== undefined) job.before = this.normalizeConstraints(options.before)
      if (options.after !== undefined) job.after = this.normalizeConstraints(options.after)
      this.requestRebuild()
    }
  }

  //* Frame Loop Control --------------------------------

  /**
   * Start the RAF loop
   */
  start(): void {
    if (this.loopState.running) return

    const newConfig = {
      running: true,
      elapsedTime: 0,
      lastTime: performance.now(),
      createdAt: performance.now(),
      frameCount: 0,
      rafHandle: requestAnimationFrame(this.loop),
    }
    Object.assign(this.loopState, newConfig)
  }

  /**
   * Stop the RAF loop
   */
  stop(): void {
    if (!this.loopState.running) return

    this.loopState.running = false
    if (this.loopState.rafHandle !== null) {
      cancelAnimationFrame(this.loopState.rafHandle)
      this.loopState.rafHandle = null
    }
  }

  /**
   * Request a frame to be rendered (for demand mode).
   * In 'always' mode this is a no-op. In 'never' mode this is ignored.
   * @param frames Number of frames to request (default: 1)
   */
  invalidate(frames: number = 1): void {
    if (this.frameloop !== 'demand') return

    this.pendingFrames = Math.min(60, this.pendingFrames + frames)

    // Start the loop if not running
    if (!this.loopState.running && this.pendingFrames > 0) {
      this.start()
    }
  }

  // Manual Stepping (for frameloop='never' or testing) --------------------------------

  /**
   * Manually step the scheduler, running all jobs once.
   * Useful for frameloop='never' mode or testing.
   * @param timestamp Optional timestamp (defaults to performance.now())
   */
  step(timestamp?: number): void {
    const now = timestamp ?? performance.now()

    // Rebuild if needed
    if (this.needsRebuild) this.rebuild()

    // Calculate delta & update loop state
    const delta = now - (this.loopState.lastTime || now)
    this.loopState.lastTime = now
    this.loopState.frameCount++
    this.loopState.elapsedTime += delta

    // Get R3F state
    const rootState = this.getState?.()
    if (!rootState) return

    // Build frame state
    const frameState: FrameNextState = {
      ...rootState,
      time: now,
      delta,
      elapsed: this.loopState.elapsedTime,
      frame: this.loopState.frameCount,
    }

    // Dispatch all jobs
    this.dispatch(frameState, delta, now)
  }

  /**
   * Manually step a single job by ID.
   * Bypasses FPS limiting and enabled checks - always runs if job exists.
   * @param id Job ID to step
   * @param timestamp Optional timestamp (defaults to performance.now())
   */
  stepJob(id: string, timestamp?: number): void {
    const job = this.jobsById.get(id)
    if (!job) return console.warn(`[useFrameNext] Job "${id}" not found`)

    const now = timestamp ?? performance.now()
    const delta = now - (this.loopState.lastTime || now)
    const elapsed = now - this.loopState.createdAt

    // Get R3F state
    const rootState = this.getState?.()
    if (!rootState) return

    // Build frame state
    const frameState: FrameNextState = {
      ...rootState,
      time: now,
      delta,
      elapsed,
      frame: this.loopState.frameCount,
    }

    // Run the job directly (bypass shouldRun checks)
    try {
      job.callback(frameState, delta)
    } catch (error) {
      console.error(`[useFrameNext] Error in job "${job.id}":`, error)
    }
  }

  /**
   * Check if a job is paused (enabled=false)
   * Returns false if job doesn't exist (jobs register as enabled by default)
   */
  isJobPaused(id: string): boolean {
    const job = this.jobsById.get(id)
    return job ? !job.enabled : false
  }

  /**
   * Pause a job (set enabled=false)
   */
  pauseJob(id: string): void {
    this.updateJob(id, { enabled: false })
  }

  /**
   * Resume a job (set enabled=true)
   */
  resumeJob(id: string): void {
    this.updateJob(id, { enabled: true })
  }

  //* Core Loop --------------------------------

  private loop(timestamp: number): void {
    if (!this.loopState.running) return

    // Rebuild if needed
    if (this.needsRebuild) this.rebuild()

    // Calculate delta & elapsed time
    const delta = timestamp - this.loopState.lastTime
    this.loopState.lastTime = timestamp
    this.loopState.frameCount++
    this.loopState.elapsedTime += delta

    // Get R3F state
    const rootState = this.getState?.()
    if (!rootState) return

    // Build frame state
    const frameState: FrameNextState = {
      ...rootState,
      time: timestamp,
      delta,
      elapsed: this.loopState.elapsedTime,
      frame: this.loopState.frameCount,
    }

    // Dispatch jobs
    this.dispatch(frameState, delta, timestamp)

    // Handle demand mode - decrement pending frames
    if (this.frameloop === 'demand') {
      this.pendingFrames = Math.max(0, this.pendingFrames - 1)
      if (this.pendingFrames === 0) return this.stop()
    }

    // Schedule next frame
    this.loopState.rafHandle = requestAnimationFrame(this.loop)
  }

  /**
   * Dispatch all jobs for this frame
   */
  private dispatch(state: FrameNextState, delta: number, now: number): void {
    for (const job of this.sortedJobs) {
      if (!shouldRun(job, now)) continue

      try {
        job.callback(state, delta)
      } catch (error) {
        // Log but don't break the loop
        console.error(`[useFrameNext] Error in job "${job.id}":`, error)
      }
    }
  }

  // Rebuild (Microtask Batched) --------------------------------

  /**
   * Request a rebuild of the sorted job list.
   * Uses microtask batching to coalesce multiple calls.
   */
  private requestRebuild(): void {
    this.needsRebuild = true

    if (this.rebuildRequested) return
    this.rebuildRequested = true

    queueMicrotask(() => {
      this.rebuildRequested = false
      if (this.needsRebuild) {
        this.rebuild()
      }
    })
  }

  /**
   * Rebuild the sorted job list immediately
   */
  private rebuild(): void {
    this.sortedJobs = rebuildSortedJobs(this.jobsById, this.phaseGraph)
    this.needsRebuild = false
  }

  // Utility --------------------------------

  private generateId(): string {
    return `job_${this.nextIndex}`
  }

  private normalizeConstraints(value?: string | string[]): Set<string> {
    if (!value) return new Set()
    if (Array.isArray(value)) return new Set(value)
    return new Set([value])
  }

  // Debug / Inspection --------------------------------

  /**
   * Get the number of registered jobs
   */
  getJobCount(): number {
    return this.jobsById.size
  }

  /**
   * Get all job IDs (for debugging)
   */
  getJobIds(): string[] {
    return Array.from(this.jobsById.keys())
  }

  //* Static Factory --------------------------------

  /**
   * Create a new Scheduler instance
   * @param getState - Optional state getter to automatically connect the scheduler
   */
  static create(getState?: () => RootState): Scheduler {
    const scheduler = new Scheduler()
    if (getState) scheduler.connect(getState)
    return scheduler
  }
}
