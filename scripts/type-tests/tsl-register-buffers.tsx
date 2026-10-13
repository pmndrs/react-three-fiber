// Buffers and GPU storage registered with `strict: false`, uniforms and nodes not registered.
// Registered entries are typed by name, unregistered root keys read as the broad BufferLike /
// StorageLike union instead of being errors, and uniforms and nodes stay loose.
import { StorageTexture } from 'three/webgpu'
import type { StorageBufferNode } from 'three/webgpu'
import { useBuffers, useGPUStorage, useNodes, useUniforms } from '@react-three/tsl'
import { useFrame } from '../../packages/fiber/dist/index'
import { instanceIndex, instancedArray, texture, vec3 } from 'three/tsl'

declare module '@react-three/tsl' {
  interface Register {
    buffers: { positions: StorageBufferNode<'vec3'> }
    bufferScopes: { particles: { colors: StorageBufferNode<'vec4'> } }
    gpuStorage: { heightMap: StorageTexture }
    strict: false
  }
}

export function Reader() {
  const buffers = useBuffers()
  buffers.positions.element(instanceIndex).assign(vec3(0))
  // strict: false: an unregistered root key is allowed, as the BufferLike union
  const adhoc = buffers.velocities as Float32Array
  // @ts-expect-error registered keys keep their type: a vec3 buffer node is no typed array
  const wrong: Float32Array = buffers.positions
  useBuffers('particles').colors.element(instanceIndex)

  // Creators are still checked against the registered types.
  // @ts-expect-error positions is registered as a vec3 buffer node
  useBuffers(() => ({ positions: new Float32Array(3) }))
  useBuffers(() => ({ velocities: instancedArray(4, 'vec3') }))

  const storage = useGPUStorage()
  texture(storage.heightMap)
  const extra = storage.extra as StorageTexture
  // @ts-expect-error heightMap is registered as a StorageTexture
  useGPUStorage(() => ({ heightMap: instancedArray(4, 'vec3') }))
  useGPUStorage(() => ({ heightMap: new StorageTexture(8, 8) }))

  // Uniforms and nodes are not registered: loose reads, usable without casts.
  useUniforms().uTime.mul(2)
  useNodes().wobble.mul(2)
  useFrame(({ buffers, gpuStorage, uniforms }) => {
    const p: StorageBufferNode<'vec3'> = buffers.positions
    const h: StorageTexture = gpuStorage.heightMap
    uniforms.uTime.value += 1
    void [p, h]
  })
  void [adhoc, wrong, extra]
  return null
}
