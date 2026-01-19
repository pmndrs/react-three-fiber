//* Scheduler - Global Singleton Job Scheduling System ==============================
// Author: DennisSmolek
/* Note: This is a base draft and solid but not bleeding edge performance based.
It is based on various engine loops end schedule systems like Jokt and https://github.com/pmndrs/directed
It is class based (Krispy will hate it) but the api is solid
*/

import type { AddPhaseOptions, FrameNextState, FrameNextCallback, Frameloop, RootOptions } from '#types'
import { PhaseGraph } from './phaseGraph'
import { rebuildSortedJobs } from './sorter'
import { shouldRun, resetJobTiming } from './rateLimiter'

//* HMR Support ==============================
// Preserve scheduler instance across hot module reloads
// This prevents the render loop from stopping during development
declare const import_meta_hot: HMRData | undefined

// Get HMR data for development hot reloading
// - In production builds: unbuild transforms import.meta.hot to import_meta_hot
// - In Jest tests: Skip entirely (NODE_ENV === 'test')
// - Uses indirect eval to avoid TypeScript parsing import.meta syntax
const hmrData = (() => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return undefined
  if (typeof import_meta_hot !== 'undefined') return import_meta_hot
  // Indirect eval prevents TypeScript from parsing import.meta

  try {
    return (0, eval)('import.meta.hot') as HMRData | undefined
  } catch {
    return undefined
  }
})()

/**
 * Global Singleton Scheduler - manages the frame loop and job execution for ALL R3F roots.
 *
 * Features:
 * - Single RAF loop for entire application
 * - Root registration (multiple Canvas support)
 * - Global phases for addEffect/addAfterEffect (deprecated)
 * - Per-root job management with phases, priorities, FPS throttling
 * - onIdle callbacks for addTail (deprecated)
 * - Demand mode support via invalidate()
 */
export class Scheduler {
  //* Static State & Methods (Singleton Usage) ================================

  //* Cross-Bundle Singleton Key ==============================
  // Use Symbol.for() to ensure scheduler is shared across bundle boundaries
  // This prevents issues when mixing imports from @react-three/fiber and @react-three/fiber/webgpu
  private static readonly INSTANCE_KEY = Symbol.for('@react-three/fiber.scheduler')

  private static get instance(): Scheduler | null {
    return (globalThis as any)[Scheduler.INSTANCE_KEY] ?? null
  }

  private static set instance(value: Scheduler | null) {
    ;(globalThis as any)[Scheduler.INSTANCE_KEY] = value
  }

  /**
   * Get the global scheduler instance (creates if doesn't exist).
   * Uses HMR data to preserve instance across hot reloads.
   * @returns {Scheduler} The singleton scheduler instance
   */
  static get(): Scheduler {
    // Try to restore from HMR data first (prevents render loop stopping on HMR)
    if (!Scheduler.instance && hmrData?.data?.scheduler) {
      Scheduler.instance = hmrData.data.scheduler
    }
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler()
      // Store in HMR data for persistence across reloads
      if (hmrData?.data) {
        hmrData.data.scheduler = Scheduler.instance
      }
    }
    return Scheduler.instance
  }

  /**
   * Reset the singleton instance. Stops the loop and clears all state.
   * Primarily used for testing to ensure clean state between tests.
   * @returns {void}
   */
  static reset(): void {
    if (Scheduler.instance) {
      Scheduler.instance.stop()
      Scheduler.instance = null
    }
    // Also clear from HMR data
    if (hmrData?.data) {
      hmrData.data.scheduler = null
    }
  }

  //* Critical State ================================

  private roots: Map<string, RootEntry> = new Map()
  private phaseGraph: PhaseGraph
  private loopState: FrameLoopState = {
    running: false,
    rafHandle: null,
    lastTime: null, // null = uninitialized, 0+ = valid timestamp
    frameCount: 0,
    elapsedTime: 0,
    createdAt: performance.now(),
  }
  private stoppedTime: number = 0

  //* Private State ================================

  private nextRootIndex: number = 0
  private globalBeforeJobs: Map<string, GlobalJob> = new Map()
  private globalAfterJobs: Map<string, GlobalJob> = new Map()
  private nextGlobalIndex: number = 0
  private idleCallbacks: Set<(timestamp: number) => void> = new Set()
  private nextJobIndex: number = 0
  private jobStateListeners: Map<string, Set<() => void>> = new Map()
  private pendingFrames: number = 0
  private _frameloop: Frameloop = 'always'

  //* Independent Mode & Error Handling State ================================

  private _independent: boolean = false
  private errorHandler: ((error: Error) => void) | null = null
  private rootReadyCallbacks: Set<() => void> = new Set()

  //* Getters & Setters ================================

  get phases(): string[] {
    return this.phaseGraph.getOrderedPhases()
  }

  get frameloop(): Frameloop {
    return this._frameloop
  }

  set frameloop(mode: Frameloop) {
    if (this._frameloop === mode) return
    const wasAlways = this._frameloop === 'always'
    this._frameloop = mode

    if (mode === 'always' && !this.loopState.running && this.roots.size > 0) this.start()
    else if (mode !== 'always' && wasAlways) this.stop()
  }

  get isRunning(): boolean {
    return this.loopState.running
  }

  get isReady(): boolean {
    return this.roots.size > 0
  }

  get independent(): boolean {
    return this._independent
  }

  set independent(value: boolean) {
    this._independent = value
    if (value) this.ensureDefaultRoot()
  }

  //* Constructor ================================

  constructor() {
    this.phaseGraph = new PhaseGraph()
  }

  //* Root Management Methods ================================

  /**
   * Register a root (Canvas) with the scheduler.
   * The first root to register starts the RAF loop (if frameloop='always').
   * @param {string} id - Unique identifier for this root
   * @param {RootOptions} [options] - Optional configuration with getState and onError callbacks
   * @returns {() => void} Unsubscribe function to remove this root
   */
  registerRoot(id: string, options: RootOptions = {}): () => void {
    if (this.roots.has(id)) {
      console.warn(`[Scheduler] Root "${id}" already registered`)
      return () => this.unregisterRoot(id)
    }

    const entry: RootEntry = {
      id,
      getState: options.getState ?? (() => ({})),
      jobs: new Map(),
      sortedJobs: [],
      needsRebuild: false,
    }

    // Bind error handler from root
    // Always update if provided - allows new roots to override stale handlers
    // @see https://github.com/pmndrs/react-three-fiber/issues/3651
    if (options.onError) {
      this.errorHandler = options.onError
    }

    this.roots.set(id, entry)

    // Notify waiters on first root
    if (this.roots.size === 1) {
      this.notifyRootReady()
      // First root starts the loop (if frameloop allows)
      if (this._frameloop === 'always') this.start()
    }

    return () => this.unregisterRoot(id)
  }

  /**
   * Unregister a root from the scheduler.
   * Cleans up all job state listeners for this root's jobs.
   * The last root to unregister stops the RAF loop.
   * @param {string} id - The root ID to unregister
   * @returns {void}
   */
  unregisterRoot(id: string): void {
    const root = this.roots.get(id)
    if (!root) return

    // Clean up job state listeners for this root's jobs
    for (const jobId of root.jobs.keys()) {
      this.jobStateListeners.delete(jobId)
    }

    this.roots.delete(id)

    // Last root stops the loop and clears error handler
    if (this.roots.size === 0) {
      this.stop()
      // Clear error handler to avoid stale references when new roots register
      // @see https://github.com/pmndrs/react-three-fiber/issues/3651
      this.errorHandler = null
    }
  }

  /**
   * Subscribe to be notified when a root becomes available.
   * Fires immediately if a root already exists.
   * @param {() => void} callback - Function called when first root registers
   * @returns {() => void} Unsubscribe function
   */
  onRootReady(callback: () => void): () => void {
    if (this.roots.size > 0) {
      callback()
      return () => {}
    }
    this.rootReadyCallbacks.add(callback)
    return () => this.rootReadyCallbacks.delete(callback)
  }

  /**
   * Notify all registered root-ready callbacks.
   * Called when the first root registers.
   * @returns {void}
   * @private
   */
  private notifyRootReady(): void {
    for (const cb of this.rootReadyCallbacks) {
      try {
        cb()
      } catch (error) {
        console.error('[Scheduler] Error in root-ready callback:', error)
      }
    }
    this.rootReadyCallbacks.clear()
  }

  /**
   * Ensure a default root exists for independent mode.
   * Creates a minimal root with no state provider.
   * @returns {void}
   * @private
   */
  private ensureDefaultRoot(): void {
    if (!this.roots.has('__default__')) {
      this.registerRoot('__default__')
    }
  }

  /**
   * Trigger error handling for job errors.
   * Uses the bound error handler if available, otherwise logs to console.
   * @param {Error} error - The error to handle
   * @returns {void}
   */
  triggerError(error: Error): void {
    if (this.errorHandler) this.errorHandler(error)
    else console.error('[Scheduler]', error)
  }

  //* Phase Management Methods ================================

  /**
   * Add a named phase to the scheduler's execution order.
   * Marks all roots for rebuild to incorporate the new phase.
   * @param {string} name - The phase name (e.g., 'physics', 'postprocess')
   * @param {AddPhaseOptions} [options] - Positioning options (before/after other phases)
   * @returns {void}
   * @example
   * scheduler.addPhase('physics', { before: 'update' });
   * scheduler.addPhase('postprocess', { after: 'render' });
   */
  addPhase(name: string, options?: AddPhaseOptions): void {
    this.phaseGraph.addPhase(name, options)
    // Mark all roots for rebuild
    for (const root of this.roots.values()) {
      root.needsRebuild = true
    }
  }

  /**
   * Check if a phase exists in the scheduler.
   * @param {string} name - The phase name to check
   * @returns {boolean} True if the phase exists
   */
  hasPhase(name: string): boolean {
    return this.phaseGraph.hasPhase(name)
  }

  //* Global Job Registration Methods (Deprecated APIs) ================================

  /**
   * Register a global job that runs once per frame (not per-root).
   * Used internally by deprecated addEffect/addAfterEffect APIs.
   * @param {'before' | 'after'} phase - When to run: 'before' all roots or 'after' all roots
   * @param {string} id - Unique identifier for this global job
   * @param {(timestamp: number) => void} callback - Function called each frame with RAF timestamp
   * @returns {() => void} Unsubscribe function to remove this global job
   * @deprecated Use useFrame with phases instead
   */
  registerGlobal(phase: 'before' | 'after', id: string, callback: (timestamp: number) => void): () => void {
    const job: GlobalJob = { id, callback }

    if (phase === 'before') {
      this.globalBeforeJobs.set(id, job)
    } else {
      this.globalAfterJobs.set(id, job)
    }

    return () => {
      if (phase === 'before') this.globalBeforeJobs.delete(id)
      else this.globalAfterJobs.delete(id)
    }
  }

  //* Idle Callback Methods (Deprecated API) ================================

  /**
   * Register an idle callback that fires when the loop stops.
   * Used internally by deprecated addTail API.
   * @param {(timestamp: number) => void} callback - Function called when loop becomes idle
   * @returns {() => void} Unsubscribe function to remove this idle callback
   * @deprecated Use demand mode with invalidate() instead
   */
  onIdle(callback: (timestamp: number) => void): () => void {
    this.idleCallbacks.add(callback)
    return () => this.idleCallbacks.delete(callback)
  }

  /**
   * Notify all registered idle callbacks.
   * Called when the loop stops in demand mode.
   * @param {number} timestamp - The RAF timestamp when idle occurred
   * @returns {void}
   * @private
   */
  private notifyIdle(timestamp: number): void {
    for (const cb of this.idleCallbacks) {
      try {
        cb(timestamp)
      } catch (error) {
        console.error('[Scheduler] Error in idle callback:', error)
      }
    }
  }

  //* Job Registration & Management Methods ================================

  /**
   * Register a job (frame callback) with a specific root.
   * This is the core registration method used by useFrame internally.
   * @param {FrameNextCallback} callback - The function to call each frame
   * @param {JobOptions & { rootId?: string; system?: boolean }} [options] - Job configuration
   * @param {string} [options.rootId] - Target root ID (defaults to first registered root)
   * @param {string} [options.id] - Unique job ID (auto-generated if not provided)
   * @param {string} [options.phase] - Execution phase (defaults to 'update')
   * @param {number} [options.priority] - Priority within phase (higher = earlier, default 0)
   * @param {number} [options.fps] - FPS throttle limit
   * @param {boolean} [options.drop] - Drop frames when behind (default true)
   * @param {boolean} [options.enabled] - Whether job is active (default true)
   * @param {boolean} [options.system] - Internal flag for system jobs (not user-facing)
   * @returns {() => void} Unsubscribe function to remove this job
   */
  register(callback: FrameNextCallback, options: JobOptions & { rootId?: string; system?: boolean } = {}): () => void {
    // Find the root - use provided rootId or find first root
    const rootId = options.rootId
    const root = rootId ? this.roots.get(rootId) : this.roots.values().next().value

    if (!root) {
      console.warn('[Scheduler] No root registered. Is this inside a Canvas?')
      return () => {}
    }

    const id = options.id ?? this.generateJobId()

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
      index: this.nextJobIndex++,
      fps: options.fps,
      drop: options.drop ?? true,
      enabled: options.enabled ?? true,
      system: options.system ?? false,
    }

    // Handle duplicate IDs (last wins)
    if (root.jobs.has(id)) {
      console.warn(`[useFrame] Job with id "${id}" already exists, replacing`)
    }

    root.jobs.set(id, job)
    root.needsRebuild = true

    return () => this.unregister(id, root.id)
  }

  /**
   * Unregister a job by its ID.
   * Searches all roots if rootId is not provided.
   * @param {string} id - The job ID to unregister
   * @param {string} [rootId] - Optional root ID to search (searches all if not provided)
   * @returns {void}
   */
  unregister(id: string, rootId?: string): void {
    // Find the root containing this job
    const root = rootId ? this.roots.get(rootId) : Array.from(this.roots.values()).find((r) => r.jobs.has(id))

    if (root?.jobs.delete(id)) {
      root.needsRebuild = true
      this.jobStateListeners.delete(id)
    }
  }

  /**
   * Update a job's options dynamically.
   * Searches all roots to find the job by ID.
   * Phase/constraint changes trigger a rebuild of the sorted job list.
   * @param {string} id - The job ID to update
   * @param {Partial<JobOptions>} options - The options to update
   * @returns {void}
   */
  updateJob(id: string, options: Partial<JobOptions>): void {
    // Find the job across all roots
    let job: Job | undefined
    let root: RootEntry | undefined

    for (const r of this.roots.values()) {
      job = r.jobs.get(id)
      if (job) {
        root = r
        break
      }
    }

    if (!job || !root) return

    // Update mutable fields
    if (options.priority !== undefined) job.priority = options.priority
    if (options.fps !== undefined) job.fps = options.fps
    if (options.drop !== undefined) job.drop = options.drop

    if (options.enabled !== undefined) {
      const wasEnabled = job.enabled
      job.enabled = options.enabled
      if (!wasEnabled && job.enabled) resetJobTiming(job)
      if (wasEnabled !== job.enabled) root.needsRebuild = true
    }

    // Phase changes require rebuild
    if (options.phase !== undefined || options.before !== undefined || options.after !== undefined) {
      if (options.phase) job.phase = options.phase
      if (options.before !== undefined) job.before = this.normalizeConstraints(options.before)
      if (options.after !== undefined) job.after = this.normalizeConstraints(options.after)
      root.needsRebuild = true
    }
  }

  //* Job State Management Methods ================================

  /**
   * Check if a job is currently paused (disabled).
   * @param {string} id - The job ID to check
   * @returns {boolean} True if the job exists and is paused
   */
  isJobPaused(id: string): boolean {
    for (const root of this.roots.values()) {
      const job = root.jobs.get(id)
      if (job) return !job.enabled
    }
    return false
  }

  /**
   * Subscribe to state changes for a specific job.
   * Listener is called when job is paused or resumed.
   * @param {string} id - The job ID to subscribe to
   * @param {() => void} listener - Callback invoked on state changes
   * @returns {() => void} Unsubscribe function
   */
  subscribeJobState(id: string, listener: () => void): () => void {
    if (!this.jobStateListeners.has(id)) {
      this.jobStateListeners.set(id, new Set())
    }
    this.jobStateListeners.get(id)!.add(listener)

    return () => {
      this.jobStateListeners.get(id)?.delete(listener)
      if (this.jobStateListeners.get(id)?.size === 0) {
        this.jobStateListeners.delete(id)
      }
    }
  }

  /**
   * Notify all listeners that a job's state has changed.
   * @param {string} id - The job ID that changed
   * @returns {void}
   * @private
   */
  private notifyJobStateChange(id: string): void {
    this.jobStateListeners.get(id)?.forEach((listener) => listener())
  }

  /**
   * Pause a job by ID (sets enabled=false).
   * Notifies any subscribed state listeners.
   * @param {string} id - The job ID to pause
   * @returns {void}
   */
  pauseJob(id: string): void {
    this.updateJob(id, { enabled: false })
    this.notifyJobStateChange(id)
  }

  /**
   * Resume a paused job by ID (sets enabled=true).
   * Resets job timing to prevent frame accumulation.
   * Notifies any subscribed state listeners.
   * @param {string} id - The job ID to resume
   * @returns {void}
   */
  resumeJob(id: string): void {
    this.updateJob(id, { enabled: true })
    this.notifyJobStateChange(id)
  }

  //* Frame Loop Control Methods ================================

  /**
   * Start the requestAnimationFrame loop.
   * Resets timing state (elapsedTime, frameCount) on start.
   * No-op if already running.
   * @returns {void}
   */
  start(): void {
    if (this.loopState.running) return
    const { elapsedTime, createdAt } = this.loopState
    let adjustedCreated = 0

    // if we were stopped, the elapsed time will explode, so we need to subtract
    // the time we were stopped for from the START time. Old elapsed will persist
    if (this.stoppedTime > 0) {
      adjustedCreated = createdAt - (performance.now() - this.stoppedTime)
      this.stoppedTime = 0
    }

    Object.assign(this.loopState, {
      running: true,
      elapsedTime: elapsedTime ?? 0,
      lastTime: performance.now(),
      createdAt: adjustedCreated > 0 ? adjustedCreated : performance.now(),
      frameCount: 0,
      rafHandle: requestAnimationFrame(this.loop),
    })
  }

  /**
   * Stop the requestAnimationFrame loop.
   * Cancels any pending RAF callback.
   * No-op if not running.
   * @returns {void}
   */
  stop(): void {
    if (!this.loopState.running) return

    this.loopState.running = false
    if (this.loopState.rafHandle !== null) {
      cancelAnimationFrame(this.loopState.rafHandle)
      this.loopState.rafHandle = null
    }
    this.stoppedTime = performance.now()
  }

  /**
   * Request frames to be rendered in demand mode.
   * Accumulates pending frames (capped at 60) and starts the loop if not running.
   * No-op if frameloop is not 'demand'.
   * @param {number} [frames=1] - Number of frames to request
   * @param {boolean} [stackFrames=false] - Whether to add frames to existing pending count
   *   - `false` (default): Sets pending frames to the specified value (replaces existing count)
   *   - `true`: Adds frames to existing pending count (useful for accumulating invalidations)
   * @returns {void}
   * @example
   * // Request a single frame render
   * scheduler.invalidate();
   *
   * @example
   * // Request 5 frames (e.g., for animations)
   * scheduler.invalidate(5);
   *
   * @example
   * // Set pending frames to exactly 3 (don't stack with existing)
   * scheduler.invalidate(3, false);
   *
   * @example
   * // Add 2 more frames to existing pending count
   * scheduler.invalidate(2, true);
   */
  invalidate(frames: number = 1, stackFrames: boolean = false): void {
    if (this._frameloop !== 'demand') return
    const baseFrames = stackFrames ? this.pendingFrames : 0
    this.pendingFrames = Math.min(60, baseFrames + frames)

    if (!this.loopState.running && this.pendingFrames > 0) this.start()
  }

  /**
   * Reset timing state for deterministic testing.
   * Preserves jobs and roots but resets lastTime, frameCount, elapsedTime, etc.
   * @returns {void}
   */
  resetTiming(): void {
    this.loopState.lastTime = null
    this.loopState.frameCount = 0
    this.loopState.elapsedTime = 0
    this.loopState.createdAt = performance.now()
  }

  //* Manual Stepping Methods ================================

  /**
   * Manually execute a single frame for all roots.
   * Useful for frameloop='never' mode or testing scenarios.
   * @param {number} [timestamp] - Optional timestamp (defaults to performance.now())
   * @returns {void}
   * @example
   * // Manual control mode
   * scheduler.frameloop = 'never';
   * scheduler.step(); // Execute one frame
   */
  step(timestamp?: number): void {
    const now = timestamp ?? performance.now()
    this.executeFrame(now)
  }

  /**
   * Manually execute a single job by its ID.
   * Useful for testing individual job callbacks in isolation.
   * @param {string} id - The job ID to step
   * @param {number} [timestamp] - Optional timestamp (defaults to performance.now())
   * @returns {void}
   */
  stepJob(id: string, timestamp?: number): void {
    // Find the job and its root
    let job: Job | undefined
    let root: RootEntry | undefined

    for (const r of this.roots.values()) {
      job = r.jobs.get(id)
      if (job) {
        root = r
        break
      }
    }

    if (!job || !root) {
      console.warn(`[Scheduler] Job "${id}" not found`)
      return
    }

    const now = timestamp ?? performance.now()
    const deltaMs = this.loopState.lastTime !== null ? now - this.loopState.lastTime : 0
    const delta = deltaMs / 1000 // Convert to seconds
    const elapsed = now - this.loopState.createdAt
    const providedState = root.getState?.() ?? {}

    const frameState = {
      ...providedState,
      time: now,
      delta,
      elapsed,
      frame: this.loopState.frameCount,
    } as FrameNextState

    try {
      job.callback(frameState, delta)
    } catch (error) {
      console.error(`[Scheduler] Error in job "${job.id}":`, error)
      this.triggerError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  //* Core Loop Execution Methods ================================

  /**
   * Main RAF loop callback.
   * Executes frame, handles demand mode, and schedules next frame.
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @returns {void}
   * @private
   */
  private loop = (timestamp: number): void => {
    if (!this.loopState.running) return

    this.executeFrame(timestamp)

    // Handle demand mode
    if (this._frameloop === 'demand') {
      this.pendingFrames = Math.max(0, this.pendingFrames - 1)
      if (this.pendingFrames === 0) {
        this.notifyIdle(timestamp)
        return this.stop()
      }
    }

    // Schedule next frame
    this.loopState.rafHandle = requestAnimationFrame(this.loop)
  }

  /**
   * Execute a single frame across all roots.
   * Order: globalBefore → each root's jobs → globalAfter
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @returns {void}
   * @private
   */
  private executeFrame(timestamp: number): void {
    // Update timing (RAF provides ms, convert delta to seconds for consistency with legacy THREE.Clock)
    // Handle first frame case where lastTime is null - use timestamp as base (delta = 0)
    const deltaMs = this.loopState.lastTime !== null ? timestamp - this.loopState.lastTime : 0
    const delta = deltaMs / 1000 // Convert to seconds
    this.loopState.lastTime = timestamp
    this.loopState.frameCount++
    this.loopState.elapsedTime += deltaMs // Keep elapsed in ms for internal tracking

    // 1. Run globalBefore jobs (addEffect)
    this.runGlobalJobs(this.globalBeforeJobs, timestamp)

    // 2. For each root, run its jobs
    for (const root of this.roots.values()) {
      this.tickRoot(root, timestamp, delta)
    }

    // 3. Run globalAfter jobs (addAfterEffect)
    this.runGlobalJobs(this.globalAfterJobs, timestamp)
  }

  /**
   * Run all global jobs from a job map.
   * Catches and logs errors without stopping execution.
   * @param {Map<string, GlobalJob>} jobs - The global jobs map to execute
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @returns {void}
   * @private
   */
  private runGlobalJobs(jobs: Map<string, GlobalJob>, timestamp: number): void {
    for (const job of jobs.values()) {
      try {
        job.callback(timestamp)
      } catch (error) {
        console.error(`[Scheduler] Error in global job "${job.id}":`, error)
      }
    }
  }

  /**
   * Execute all jobs for a single root in sorted order.
   * Rebuilds sorted job list if needed, then dispatches each job.
   * Errors are caught and propagated via triggerError.
   * @param {RootEntry} root - The root entry to tick
   * @param {number} timestamp - RAF timestamp in milliseconds
   * @param {number} delta - Time since last frame in seconds
   * @returns {void}
   * @private
   */
  private tickRoot(root: RootEntry, timestamp: number, delta: number): void {
    // Rebuild if needed
    if (root.needsRebuild) {
      root.sortedJobs = rebuildSortedJobs(root.jobs, this.phaseGraph)
      root.needsRebuild = false
    }

    const providedState = root.getState?.() ?? {}

    // Build frame state (elapsed converted to seconds for user-facing API)
    const frameState = {
      ...providedState,
      time: timestamp,
      delta,
      elapsed: this.loopState.elapsedTime / 1000, // Convert ms to seconds
      frame: this.loopState.frameCount,
    } as FrameNextState

    // Dispatch jobs
    for (const job of root.sortedJobs) {
      if (!shouldRun(job, timestamp)) continue

      try {
        job.callback(frameState, delta)
      } catch (error) {
        console.error(`[Scheduler] Error in job "${job.id}":`, error)
        // Propagate error via pluggable handler
        this.triggerError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  //* Debug & Inspection Methods ================================

  /**
   * Get the total number of registered jobs across all roots.
   * Includes both per-root jobs and global before/after jobs.
   * @returns {number} Total job count
   */
  getJobCount(): number {
    let count = 0
    for (const root of this.roots.values()) {
      count += root.jobs.size
    }
    return count + this.globalBeforeJobs.size + this.globalAfterJobs.size
  }

  /**
   * Get all registered job IDs across all roots.
   * Includes both per-root jobs and global before/after jobs.
   * @returns {string[]} Array of all job IDs
   */
  getJobIds(): string[] {
    const ids: string[] = []
    for (const root of this.roots.values()) {
      ids.push(...root.jobs.keys())
    }
    ids.push(...this.globalBeforeJobs.keys())
    ids.push(...this.globalAfterJobs.keys())
    return ids
  }

  /**
   * Get the number of registered roots (Canvas instances).
   * @returns {number} Number of registered roots
   */
  getRootCount(): number {
    return this.roots.size
  }

  /**
   * Check if any user (non-system) jobs are registered in a specific phase.
   * Used by the default render job to know if a user has taken over rendering.
   *
   * @param phase The phase to check
   * @param rootId Optional root ID to check (checks all roots if not provided)
   * @returns true if any user jobs exist in the phase
   */
  hasUserJobsInPhase(phase: string, rootId?: string): boolean {
    const rootsToCheck = rootId ? [this.roots.get(rootId)].filter(Boolean) : Array.from(this.roots.values())

    // Early return pattern: stops iteration as soon as a match is found
    return rootsToCheck.some((root) => {
      if (!root) return false
      // Check if any job in this root matches criteria
      for (const job of root.jobs.values()) {
        if (job.phase === phase && !job.system && job.enabled) return true
      }
      return false
    })
  }

  //* Utility Methods ================================

  /**
   * Generate a unique root ID for automatic root registration.
   * @returns {string} A unique root ID in the format 'root_N'
   */
  generateRootId(): string {
    return `root_${this.nextRootIndex++}`
  }

  /**
   * Generate a unique job ID.
   * @returns {string} A unique job ID in the format 'job_N'
   * @private
   */
  private generateJobId(): string {
    return `job_${this.nextJobIndex}`
  }

  /**
   * Normalize before/after constraints to a Set.
   * Handles undefined, single string, or array inputs.
   * @param {string | string[] | undefined} value - The constraint value(s)
   * @returns {Set<string>} Normalized Set of constraint strings
   * @private
   */
  private normalizeConstraints(value?: string | string[]): Set<string> {
    if (!value) return new Set()
    if (Array.isArray(value)) return new Set(value)
    return new Set([value])
  }
}

//* Export Global Scheduler Getter ==============================

/**
 * Get the global scheduler instance.
 * Creates one if it doesn't exist.
 */
export const getScheduler = (): Scheduler => Scheduler.get()

//* HMR Accept ==============================
// Accept hot updates to preserve scheduler state
if (hmrData) {
  hmrData.accept?.()
}
