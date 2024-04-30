export const promiseCaches = new Set<PromiseCache>()

export class PromiseCache {
  promises = new Map<string, Promise<any>>()
  cachePromise: Promise<Cache>

  constructor(cache: string | Cache | Promise<Cache>) {
    this.cachePromise = Promise.resolve(cache).then((cache) => {
      if (typeof cache === 'string') return caches.open(cache)
      return cache
    })

    promiseCaches.add(this)
  }

  async run(url: string, handler: (url: string) => any) {
    if (this.promises.has(url)) {
      return this.promises.get(url)!
    }

    const promise = new Promise<any>(async (resolve, reject) => {
      const blob = await this.fetch(url)
      const blobUrl = URL.createObjectURL(blob)

      try {
        const result = await handler(blobUrl)
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    })

    this.promises.set(url, promise)

    return promise
  }

  async fetch(url: string): Promise<Blob> {
    const cache = await this.cachePromise

    let response = await cache.match(url)

    if (!response) {
      const fetchResponse = await fetch(url)
      if (fetchResponse.ok) {
        await cache.put(url, fetchResponse.clone())
        response = fetchResponse
      }
    }

    return response!.blob()
  }

  add(url: string, promise: Promise<any>) {
    this.promises.set(url, promise)
  }

  get(url: string) {
    return this.promises.get(url)
  }

  has(url: string) {
    return this.promises.has(url)
  }

  async delete(url: string): Promise<boolean> {
    this.promises.delete(url)
    return this.cachePromise.then((cache) => cache.delete(url))
  }
}

export const cacheName = 'assets'
