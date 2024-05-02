import * as THREE from 'three'
import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'
import { extend } from '@react-three/fiber'
import { createDataUriFromGltf } from './utils/createDataUriFromGltf'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
  var IS_REACT_NATIVE_TEST_ENVIRONMENT: boolean // https://github.com/facebook/react/pull/28419
  var gltfs: {
    diamond: string
    lightning: string
  }
  var MockLoader: typeof _MockLoader
  var MockMesh: THREE.Mesh
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true // hide react-test-renderer warnings

// PointerEvent is not in JSDOM
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
// https://w3c.github.io/pointerevents/#pointerevent-interface
if (!global.PointerEvent) {
  global.PointerEvent = class extends MouseEvent implements PointerEvent {
    readonly pointerId: number = 0
    readonly width: number = 1
    readonly height: number = 1
    readonly pressure: number = 0
    readonly tangentialPressure: number = 0
    readonly tiltX: number = 0
    readonly tiltY: number = 0
    readonly twist: number = 0
    readonly pointerType: string = ''
    readonly isPrimary: boolean = false

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
}

globalThis.WebGL2RenderingContext = WebGL2RenderingContext as any
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {} as any

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this) as any
}

// Extend catalogue for render API in tests
extend(THREE as any)

// Mock caches API
class MockCache {
  store: Map<string, Response>

  constructor() {
    this.store = new Map()
  }

  async match(url: string) {
    return this.store.get(url)
  }

  async put(url: string, response: Response) {
    this.store.set(url, response)
  }

  async delete(url: string) {
    return this.store.delete(url)
  }

  async keys() {
    return Array.from(this.store.keys())
  }
}

class MockCacheStorage {
  caches: Map<string, MockCache>

  constructor() {
    this.caches = new Map()
  }

  async open(cacheName: string) {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new MockCache())
    }
    return this.caches.get(cacheName)
  }

  async delete(cacheName: string) {
    return this.caches.delete(cacheName)
  }
}

globalThis.caches = new MockCacheStorage() as any

// Add gltf data URIs to the global scope
globalThis.gltfs = {
  diamond: createDataUriFromGltf(__dirname + '/assets/diamond.gltf'),
  lightning: createDataUriFromGltf(__dirname + '/assets/lightning.gltf'),
}

// Add mock gltf loader to the global scope
globalThis.MockMesh = new THREE.Mesh()
globalThis.MockMesh.name = 'Scene'

class _MockLoader extends THREE.Loader {
  load(url: string, onLoad: (result: { scene: THREE.Mesh; json: Record<string, any> }) => void): void {
    fetch(url)
      .then((response) => response.json())
      .then((data) => onLoad({ scene: globalThis.MockMesh, json: data }))
  }
}

globalThis.MockLoader = _MockLoader
