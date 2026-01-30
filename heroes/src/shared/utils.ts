/**
 * Shared utilities for R3F v10 Hero Demos
 */

import * as THREE from 'three'

/**
 * Simulated once() utility for demos
 * In v10, import { once } from '@react-three/fiber'
 */
export function createOnceTracker() {
  const applied = new WeakSet<object>()

  return function once<T>(target: T, transform: (t: T) => void): void {
    if (target && typeof target === 'object' && !applied.has(target as object)) {
      transform(target)
      applied.add(target as object)
    }
  }
}

/**
 * Create a simple noise function for demos
 */
export function createNoise3D(seed = 12345) {
  const permutation = Array.from({ length: 256 }, (_, i) => i)

  // Simple shuffle based on seed
  for (let i = 255; i > 0; i--) {
    const j = Math.floor((seed * (i + 1)) % (i + 1))
    ;[permutation[i], permutation[j]] = [permutation[j], permutation[i]]
  }

  const p = [...permutation, ...permutation]

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
  }

  function grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return function noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = fade(x)
    const v = fade(y)
    const w = fade(z)

    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z)),
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)),
      ),
    )
  }
}

/**
 * FPS limiter hook helper
 */
export function createFPSLimiter(targetFPS: number) {
  const frameTime = 1000 / targetFPS
  let lastFrameTime = 0

  return function shouldRender(currentTime: number): boolean {
    if (currentTime - lastFrameTime >= frameTime) {
      lastFrameTime = currentTime
      return true
    }
    return false
  }
}

/**
 * Color utilities
 */
export const colors = {
  primary: '#e74c3c',
  secondary: '#3498db',
  success: '#2ecc71',
  warning: '#f39c12',
  info: '#9b59b6',
  dark: '#1a1a2e',
  light: '#ffffff',
}

/**
 * Easing functions
 */
export const easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
}

/**
 * Random utilities
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randomColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`
}

export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Vector utilities
 */
export function randomPointInSphere(radius: number): THREE.Vector3 {
  const u = Math.random()
  const v = Math.random()
  const theta = u * 2 * Math.PI
  const phi = Math.acos(2 * v - 1)
  const r = Math.cbrt(Math.random()) * radius

  return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
}

export function randomPointOnSphere(radius: number): THREE.Vector3 {
  const u = Math.random()
  const v = Math.random()
  const theta = u * 2 * Math.PI
  const phi = Math.acos(2 * v - 1)

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  )
}
