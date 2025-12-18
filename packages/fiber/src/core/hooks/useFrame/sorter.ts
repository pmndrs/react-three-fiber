//* Job Sorter - Phase Bucket Sorting + Topological Sort ==============================

import type { PhaseGraph } from './phaseGraph'

/**
 * Rebuild the sorted job list from the job registry.
 *
 * Algorithm:
 * 1. Get ordered phases from phaseGraph
 * 2. Group jobs into phase buckets
 * 3. Sort each bucket by priority (desc) then index (asc)
 * 4. If cross-job before/after constraints exist within a bucket, run local topo sort
 * 5. Concatenate buckets into final sorted array
 */
export function rebuildSortedJobs(jobs: Map<string, Job>, phaseGraph: PhaseGraph): Job[] {
  const orderedPhases = phaseGraph.getOrderedPhases()

  // Group jobs into phase buckets --------------------------------
  const buckets = new Map<string, Job[]>()

  // Initialize buckets for known phases
  for (const phase of orderedPhases) {
    buckets.set(phase, [])
  }

  // Distribute jobs into buckets
  for (const job of jobs.values()) {
    if (!job.enabled) continue

    let bucket = buckets.get(job.phase)
    if (!bucket) {
      // Phase not in graph, create bucket (shouldn't happen often)
      bucket = []
      buckets.set(job.phase, bucket)
    }
    bucket.push(job)
  }

  // Sort each bucket --------------------------------
  const sortedBuckets: Job[][] = []

  for (const phase of orderedPhases) {
    const bucket = buckets.get(phase)
    if (!bucket || bucket.length === 0) continue

    // Sort by priority (desc) then index (asc)
    bucket.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority // higher first
      return a.index - b.index // earlier registration first
    })

    // Check for cross-job constraints within bucket
    sortedBuckets.push(hasCrossJobConstraints(bucket) ? topologicalSort(bucket) : bucket)
  }

  // Handle any unknown phases (jobs in phases not in the graph)
  for (const [phase, bucket] of buckets) {
    if (!orderedPhases.includes(phase) && bucket.length > 0) {
      bucket.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.index - b.index
      })
      sortedBuckets.push(bucket)
    }
  }

  // Concatenate all buckets
  return sortedBuckets.flat()
}

//* Cross-Job Constraint Detection --------------------------------

/**
 * Check if any jobs in the bucket have before/after constraints
 * referencing other jobs (not phases)
 */
function hasCrossJobConstraints(bucket: Job[]): boolean {
  const jobIds = new Set(bucket.map((j) => j.id))

  for (const job of bucket) {
    // Check if any before/after references another job in this bucket
    for (const ref of job.before) {
      if (jobIds.has(ref)) return true
    }
    for (const ref of job.after) {
      if (jobIds.has(ref)) return true
    }
  }

  return false
}

// Topological Sort (Kahn's Algorithm) --------------------------------

/**
 * Topological sort for jobs with cross-job constraints.
 * Uses Kahn's algorithm for stability.
 */
function topologicalSort(jobs: Job[]): Job[] {
  const n = jobs.length
  if (n <= 1) return jobs

  // Build adjacency and in-degree
  const jobMap = new Map<string, Job>()
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const job of jobs) {
    jobMap.set(job.id, job)
    inDegree.set(job.id, 0)
    adjacency.set(job.id, [])
  }

  // Build edges from constraints
  // "job A before job B" means A -> B (A comes before B)
  // "job A after job B" means B -> A (B comes before A)
  for (const job of jobs) {
    for (const ref of job.before) {
      if (jobMap.has(ref)) {
        // This job comes before 'ref', so edge: this.id -> ref
        adjacency.get(job.id)!.push(ref)
        inDegree.set(ref, inDegree.get(ref)! + 1)
      }
    }
    for (const ref of job.after) {
      if (jobMap.has(ref)) {
        // This job comes after 'ref', so edge: ref -> this.id
        adjacency.get(ref)!.push(job.id)
        inDegree.set(job.id, inDegree.get(job.id)! + 1)
      }
    }
  }

  // Kahn's algorithm with priority queue for stability
  // Start with nodes that have no incoming edges
  const queue: Job[] = []
  for (const job of jobs) {
    if (inDegree.get(job.id) === 0) {
      queue.push(job)
    }
  }

  // Sort queue by priority desc, then index asc for determinism
  queue.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    return a.index - b.index
  })

  const result: Job[] = []

  while (queue.length > 0) {
    // Take job with highest priority (already sorted)
    const job = queue.shift()!
    result.push(job)

    // Process neighbors
    const neighbors = adjacency.get(job.id) || []
    for (const neighborId of neighbors) {
      const newDegree = inDegree.get(neighborId)! - 1
      inDegree.set(neighborId, newDegree)

      if (newDegree === 0) {
        const neighbor = jobMap.get(neighborId)!
        // Insert maintaining sort order
        insertSorted(queue, neighbor)
      }
    }
  }

  // Check for cycles
  if (result.length !== n) {
    console.warn('[useFrame] Circular dependency detected in job constraints')
    // Return original order for jobs not in result
    const resultIds = new Set(result.map((j) => j.id))
    for (const job of jobs) {
      if (!resultIds.has(job.id)) result.push(job)
    }
  }

  return result
}

/**
 * Insert job into sorted array maintaining priority desc, index asc order
 */
function insertSorted(arr: Job[], job: Job): void {
  let i = 0
  while (i < arr.length) {
    const cmp = arr[i]
    if (job.priority > cmp.priority || (job.priority === cmp.priority && job.index < cmp.index)) {
      break
    }
    i++
  }
  arr.splice(i, 0, job)
}
