import * as Scheduler from 'scheduler'

// Intentionally not named imports because Rollup would
// use dynamic dispatch for CommonJS interop named imports.
const { unstable_scheduleCallback: scheduleCallback, unstable_IdlePriority: IdlePriority } = Scheduler

export function createLRU(limit) {
  let LIMIT = limit

  // Circular, doubly-linked list
  let first = null
  let size = 0

  let cleanUpIsScheduled = false

  function scheduleCleanUp() {
    if (cleanUpIsScheduled === false && size > LIMIT) {
      // The cache size exceeds the limit. Schedule a callback to delete the
      // least recently used entries.
      cleanUpIsScheduled = true
      scheduleCallback(IdlePriority, cleanUp)
    }
  }

  function cleanUp() {
    cleanUpIsScheduled = false
    deleteLeastRecentlyUsedEntries(LIMIT)
  }

  function deleteLeastRecentlyUsedEntries(targetSize) {
    // Delete entries from the cache, starting from the end of the list.
    if (first !== null) {
      const resolvedFirst = first
      let last = resolvedFirst.previous
      while (size > targetSize && last !== null) {
        const onDelete = last.onDelete
        const previous = last.previous
        last.onDelete = null

        // Remove from the list
        last.previous = last.next = null
        if (last === first) {
          // Reached the head of the list.
          first = last = null
        } else {
          first.previous = previous
          previous.next = first
          last = previous
        }

        size -= 1

        // Call the destroy method after removing the entry from the list. If it
        // throws, the rest of cache will not be deleted, but it will be in a
        // valid state.
        onDelete()
      }
    }
  }

  function add(value, onDelete) {
    const entry = {
      value,
      onDelete,
      next: null,
      previous: null,
    }
    if (first === null) {
      entry.previous = entry.next = entry
      first = entry
    } else {
      // Append to head
      const last = first.previous
      last.next = entry
      entry.previous = last

      first.previous = entry
      entry.next = first

      first = entry
    }
    size += 1
    return entry
  }

  function update(entry, newValue) {
    entry.value = newValue
  }

  function access(entry) {
    const next = entry.next
    if (next !== null) {
      // Entry already cached
      const resolvedFirst = first
      if (first !== entry) {
        // Remove from current position
        const previous = entry.previous
        previous.next = next
        next.previous = previous

        // Append to head
        const last = resolvedFirst.previous
        last.next = entry
        entry.previous = last

        resolvedFirst.previous = entry
        entry.next = resolvedFirst

        first = entry
      }
    } else {
      // Cannot access a deleted entry
      // TODO: Error? Warning?
    }
    scheduleCleanUp()
    return entry.value
  }

  function setLimit(newLimit) {
    LIMIT = newLimit
    scheduleCleanUp()
  }

  return { add, update, access, setLimit }
}

const Pending = 0
const Resolved = 1
const Rejected = 2

function identityHashFn(input) {
  return input
}

const CACHE_LIMIT = 500
const lru = createLRU(CACHE_LIMIT)
const entries = new Map()

function accessResult(resource, fetch, input, key) {
  let entriesForResource = entries.get(resource)
  if (entriesForResource === undefined) {
    entriesForResource = new Map()
    entries.set(resource, entriesForResource)
  }
  let entry = entriesForResource.get(key)
  if (entry === undefined) {
    const thenable = fetch(input)
    thenable.then(
      value => {
        if (newResult.status === Pending) {
          const resolvedResult = newResult
          resolvedResult.status = Resolved
          resolvedResult.value = value
        }
      },
      error => {
        if (newResult.status === Pending) {
          const rejectedResult = newResult
          rejectedResult.status = Rejected
          rejectedResult.value = error
        }
      }
    )
    const newResult = { status: Pending, value: thenable }
    const newEntry = lru.add(newResult, deleteEntry.bind(null, resource, key))
    entriesForResource.set(key, newEntry)
    return newResult
  } else {
    return lru.access(entry)
  }
}

function deleteEntry(resource, key) {
  const entriesForResource = entries.get(resource)
  if (entriesForResource !== undefined) {
    entriesForResource.delete(key)
    if (entriesForResource.size === 0) {
      entries.delete(resource)
    }
  }
}

export function unstable_createResource(fetch, maybeHashInput) {
  const hashInput = maybeHashInput !== undefined ? maybeHashInput : identityHashFn

  const resource = {
    read(input) {
      const result = accessResult(resource, fetch, input, hashInput(input))
      switch (result.status) {
        case Resolved:
          return result.value
        case Pending:
        case Rejected:
          throw result.value
        default:
          return undefined
      }
    },
    preload(input) {
      accessResult(resource, fetch, input, hashInput(input))
    },
  }
  return resource
}

export function unstable_setGlobalCacheLimit(limit) {
  lru.setLimit(limit)
}
