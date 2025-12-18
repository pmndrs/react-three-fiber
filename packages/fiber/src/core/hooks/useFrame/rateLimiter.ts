//* Rate Limiter - FPS Throttling with Drop/Catch-up ==============================

/**
 * Determine if a job should run this frame based on FPS limiting.
 *
 * If no FPS limit, always run.
 * If FPS limited:
 *   - Calculate minimum interval between runs
 *   - If elapsed time < interval, skip this frame
 *   - If drop=true: reset lastRun to now (drop missed frames)
 *   - If drop=false: advance lastRun by interval steps (catch-up semantics)
 *
 * NOTE: We only run ONE invocation per frame regardless of catch-up.
 * Catch-up just affects the timestamp tracking.
 *
 * @param job - The job to check
 * @param now - Current timestamp (ms)
 * @returns true if job should run this frame
 */
export function shouldRun(job: Job, now: number): boolean {
  // Disabled jobs never run
  if (!job.enabled) return false

  // No FPS limit = always run
  if (!job.fps) return true

  const minInterval = 1000 / job.fps
  const lastRun = job.lastRun ?? 0
  const elapsed = now - lastRun

  // Not enough time has passed
  if (elapsed < minInterval) return false

  // Time to run - update lastRun based on drop behavior
  if (job.drop) {
    // Drop semantics: snap to current time, skip missed frames
    job.lastRun = now
  } else {
    // Catch-up semantics: advance by multiples of minInterval
    // This helps maintain consistent timing for physics/simulations
    const steps = Math.floor(elapsed / minInterval)
    job.lastRun = lastRun + steps * minInterval

    // Prevent drift - if we're still behind, snap to now
    if (job.lastRun < now - minInterval) {
      job.lastRun = now
    }
  }

  return true
}

/**
 * Reset a job's timing state (e.g., when re-enabled)
 */
export function resetJobTiming(job: Job): void {
  job.lastRun = undefined
}
