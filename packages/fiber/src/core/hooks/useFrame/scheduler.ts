//* Scheduler - Global Singleton Job Scheduling System ==============================

import type { RootState, AddPhaseOptions, FrameNextState, FrameNextCallback, Frameloop } from '#types'
import { PhaseGraph } from './phaseGraph'
import { rebuildSortedJobs } from './sorter'
import { shouldRun, resetJobTiming } from './rateLimiter'

//* Types ==============================

interface RootEntry {
  id: string
  getState: () => RootState
  jobs: Map<string, Job>
  sortedJobs: Job[]
  needsRebuild: boolean
}

interface GlobalJob {
  id: string
  callback: (timestamp: number) => void
}

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
  //* Singleton Pattern ================================

  private static instance: Scheduler | null = null

  /**
   * Get the global scheduler instance (creates if doesn't exist)
   */
  static get(): Scheduler {
    if (!Scheduler.instance) Scheduler.instance = new Scheduler()
    return Scheduler.instance
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset(): void {
    if (Scheduler.instance) {
      Scheduler.instance.stop()
      Scheduler.instance = null
    }
  }

  /**
   * Reset timing state (for deterministic testing)
   * Preserves jobs and roots but resets lastTime, frameCount, etc.
   */
  resetTiming(): void {
    this.loopState.lastTime = null
    this.loopState.frameCount = 0
    this.loopState.elapsedTime = 0
    this.loopState.createdAt = performance.now()
  }

  //* Root Management ================================

  private roots: Map<string, RootEntry> = new Map()
  private nextRootIndex: number = 0

  /**
   * Register a root (Canvas) with the scheduler.
   * First root to register starts the RAF loop.
   * @returns Unsubscribe function
   */
  registerRoot(id: string, getState: () => RootState): () => void {
    if (this.roots.has(id)) {
      console.warn(`[Scheduler] Root "${id}" already registered`)
      return () => this.unregisterRoot(id)
    }

    const entry: RootEntry = {
      id,
      getState,
      jobs: new Map(),
      sortedJobs: [],
      needsRebuild: false,
    }

    this.roots.set(id, entry)

    // First root starts the loop (if frameloop allows)
    if (this.roots.size === 1 && this._frameloop === 'always') {
      this.start()
    }

    return () => this.unregisterRoot(id)
  }

  /**
   * Unregister a root. Last root to unregister stops the RAF loop.
   */
  unregisterRoot(id: string): void {
    const root = this.roots.get(id)
    if (!root) return

    // Clean up job state listeners for this root's jobs
    for (const jobId of root.jobs.keys()) {
      this.jobStateListeners.delete(jobId)
    }

    this.roots.delete(id)

    // Last root stops the loop
    if (this.roots.size === 0) {
      this.stop()
    }
  }

  /**
   * Generate a unique root ID
   */
  generateRootId(): string {
    return `root_${this.nextRootIndex++}`
  }

  //* Phase Management ================================

  private phaseGraph: PhaseGraph

  get phases(): string[] {
    return this.phaseGraph.getOrderedPhases()
  }

  /**
   * Add a named phase to the scheduler
   */
  addPhase(name: string, options?: AddPhaseOptions): void {
    this.phaseGraph.addPhase(name, options)
    // Mark all roots for rebuild
    for (const root of this.roots.values()) {
      root.needsRebuild = true
    }
  }

  /**
   * Check if a phase exists
   */
  hasPhase(name: string): boolean {
    return this.phaseGraph.hasPhase(name)
  }

  //* Global Jobs (for addEffect/addAfterEffect) ================================

  private globalBeforeJobs: Map<string, GlobalJob> = new Map()
  private globalAfterJobs: Map<string, GlobalJob> = new Map()
  private nextGlobalIndex: number = 0

  /**
   * Register a global job (runs once per frame, not per-root).
   * Used by deprecated addEffect/addAfterEffect.
   * @param phase 'before' or 'after'
   * @returns Unsubscribe function
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

  //* Idle Callbacks (for addTail) ================================

  private idleCallbacks: Set<(timestamp: number) => void> = new Set()

  /**
   * Register an idle callback (fires when loop stops).
   * Used by deprecated addTail.
   * @returns Unsubscribe function
   */
  onIdle(callback: (timestamp: number) => void): () => void {
    this.idleCallbacks.add(callback)
    return () => this.idleCallbacks.delete(callback)
  }

  /**
   * Notify all idle callbacks
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

  //* Per-Root Job Registration ================================

  private nextJobIndex: number = 0
  private jobStateListeners: Map<string, Set<() => void>> = new Map()

  /**
   * Register a job with a specific root.
   * @param rootId The root this job belongs to
   * @param callback The job callback
   * @param options Job options (system flag is internal-only, not exposed in public API)
   * @returns Unsubscribe function
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
   * Unregister a job by ID
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
   * Update a job's options
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

  //* Frame Loop State ================================

  private loopState: FrameLoopState = {
    running: false,
    rafHandle: null,
    lastTime: null, // null = uninitialized, 0+ = valid timestamp
    frameCount: 0,
    elapsedTime: 0,
    createdAt: performance.now(),
  }

  private pendingFrames: number = 0
  private _frameloop: Frameloop = 'always'

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

  //* Frame Loop Control ================================

  /**
   * Start the RAF loop
   */
  start(): void {
    if (this.loopState.running) return

    Object.assign(this.loopState, {
      running: true,
      elapsedTime: 0,
      lastTime: performance.now(),
      createdAt: performance.now(),
      frameCount: 0,
      rafHandle: requestAnimationFrame(this.loop),
    })
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
   * Request frames to be rendered (for demand mode)
   */
  invalidate(frames: number = 1): void {
    if (this._frameloop !== 'demand') return

    this.pendingFrames = Math.min(60, this.pendingFrames + frames)

    if (!this.loopState.running && this.pendingFrames > 0) {
      this.start()
    }
  }

  //* Manual Stepping ================================

  /**
   * Manually step all jobs once (for frameloop='never' or testing)
   */
  step(timestamp?: number): void {
    const now = timestamp ?? performance.now()
    this.executeFrame(now)
  }

  /**
   * Manually step a single job by ID
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
    const rootState = root.getState()

    const frameState: FrameNextState = {
      ...rootState,
      time: now,
      delta,
      elapsed,
      frame: this.loopState.frameCount,
    }

    try {
      job.callback(frameState, delta)
    } catch (error) {
      console.error(`[Scheduler] Error in job "${job.id}":`, error)
    }
  }

  //* Job State Management ================================

  isJobPaused(id: string): boolean {
    for (const root of this.roots.values()) {
      const job = root.jobs.get(id)
      if (job) return !job.enabled
    }
    return false
  }

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

  private notifyJobStateChange(id: string): void {
    this.jobStateListeners.get(id)?.forEach((listener) => listener())
  }

  pauseJob(id: string): void {
    this.updateJob(id, { enabled: false })
    this.notifyJobStateChange(id)
  }

  resumeJob(id: string): void {
    this.updateJob(id, { enabled: true })
    this.notifyJobStateChange(id)
  }

  //* Core Loop ================================

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
   * Execute a single frame
   */
  private executeFrame(timestamp: number): void {
    // Update timing (convert ms to seconds for delta - matches THREE.Clock behavior)
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
   * Run all global jobs for a phase
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
   * Execute jobs for a single root
   */
  private tickRoot(root: RootEntry, timestamp: number, delta: number): void {
    // Rebuild if needed
    if (root.needsRebuild) {
      root.sortedJobs = rebuildSortedJobs(root.jobs, this.phaseGraph)
      root.needsRebuild = false
    }

    const rootState = root.getState()
    if (!rootState) return

    // Build frame state (elapsed in seconds for consistency with THREE.Clock)
    const frameState: FrameNextState = {
      ...rootState,
      time: timestamp,
      delta,
      elapsed: this.loopState.elapsedTime / 1000, // Convert ms to seconds
      frame: this.loopState.frameCount,
    }

    // Dispatch jobs
    for (const job of root.sortedJobs) {
      if (!shouldRun(job, timestamp)) continue

      try {
        job.callback(frameState, delta)
      } catch (error) {
        console.error(`[Scheduler] Error in job "${job.id}":`, error)
      }
    }
  }

  //* Debug / Inspection ================================

  getJobCount(): number {
    let count = 0
    for (const root of this.roots.values()) {
      count += root.jobs.size
    }
    return count + this.globalBeforeJobs.size + this.globalAfterJobs.size
  }

  getJobIds(): string[] {
    const ids: string[] = []
    for (const root of this.roots.values()) {
      ids.push(...root.jobs.keys())
    }
    ids.push(...this.globalBeforeJobs.keys())
    ids.push(...this.globalAfterJobs.keys())
    return ids
  }

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

    for (const root of rootsToCheck) {
      if (!root) continue
      for (const job of root.jobs.values()) {
        if (job.phase === phase && !job.system && job.enabled) return true
      }
    }
    return false
  }

  //* Utility ================================

  private generateJobId(): string {
    return `job_${this.nextJobIndex}`
  }

  private normalizeConstraints(value?: string | string[]): Set<string> {
    if (!value) return new Set()
    if (Array.isArray(value)) return new Set(value)
    return new Set([value])
  }

  //* Constructor ================================

  constructor() {
    this.phaseGraph = new PhaseGraph()
  }
}

//* Export Global Scheduler Getter ==============================

/**
 * Get the global scheduler instance.
 * Creates one if it doesn't exist.
 */
export const getScheduler = (): Scheduler => Scheduler.get()
