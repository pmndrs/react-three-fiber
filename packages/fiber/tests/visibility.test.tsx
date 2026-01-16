//* Visibility Events Tests ==============================
// Tests for onFramed, onOccluded, and onVisible event handlers

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { useRef, useEffect } from 'react'
import { render, act as rtlAct } from '@testing-library/react'
import { Canvas, useThree, useFrame, extend } from '../src'
import * as THREE from '#three'
import type { RootState } from '#types'

extend(THREE as any)

// Helper to wait for R3F's initialization and frame loop
async function act<T>(fn: () => Promise<T>) {
  const value = await fn()
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
  return value
}

// Helper to advance multiple frames
async function advanceFrames(count: number = 3) {
  for (let i = 0; i < count; i++) {
    await new Promise((res) => requestAnimationFrame(() => res(null)))
  }
}

describe('visibility events', () => {
  //* onFramed Tests --------------------------------

  describe('onFramed', () => {
    it('fires with true when object is in frustum', async () => {
      const handleFramed = vi.fn()

      await act(async () => {
        render(
          <Canvas>
            <mesh position={[0, 0, 0]} onFramed={handleFramed}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </Canvas>,
        )
      })

      // Wait for visibility check to run
      await advanceFrames(3)

      // Object is at origin, camera default looks at origin, so should be in view
      expect(handleFramed).toHaveBeenCalledWith(true)
    })

    it('fires with false when object moves out of frustum', async () => {
      const handleFramed = vi.fn()
      let meshRef: THREE.Mesh | null = null

      function TestComponent() {
        const ref = useRef<THREE.Mesh>(null)

        useEffect(() => {
          meshRef = ref.current
        }, [])

        return (
          <mesh ref={ref} position={[0, 0, 0]} onFramed={handleFramed}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </mesh>
        )
      }

      await act(async () => {
        render(
          <Canvas>
            <TestComponent />
          </Canvas>,
        )
      })

      // Wait for initial visibility check
      await advanceFrames(3)

      // Clear mock to only track the next call
      handleFramed.mockClear()

      // Move object far behind camera (camera looks at -Z by default from +Z)
      await act(async () => {
        if (meshRef) {
          meshRef.position.set(0, 0, 1000)
          meshRef.updateMatrixWorld()
        }
      })

      await advanceFrames(3)

      // Should have been called with false when moving out of view
      expect(handleFramed).toHaveBeenCalledWith(false)
    })

    it('only fires on state change, not every frame', async () => {
      const handleFramed = vi.fn()

      await act(async () => {
        render(
          <Canvas>
            <mesh position={[0, 0, 0]} onFramed={handleFramed}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </Canvas>,
        )
      })

      // Wait for multiple frames
      await advanceFrames(10)

      // Should only fire once (initial state) not every frame
      expect(handleFramed).toHaveBeenCalledTimes(1)
    })
  })

  //* onOccluded Tests --------------------------------

  describe('onOccluded', () => {
    it('does not error when used without WebGPU renderer', async () => {
      const handleOccluded = vi.fn()

      // This should not throw
      await expect(
        act(async () => {
          render(
            <Canvas>
              <mesh onOccluded={handleOccluded}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>,
          )
        }),
      ).resolves.not.toThrow()

      await advanceFrames(3)

      // Without WebGPU, onOccluded should not fire (no occlusion support)
      // This is expected behavior - occlusion queries are WebGPU only
      expect(handleOccluded).not.toHaveBeenCalled()
    })

    it('sets occlusionTest flag on object', async () => {
      let meshRef: THREE.Mesh | null = null

      function TestComponent() {
        const ref = useRef<THREE.Mesh>(null)

        useEffect(() => {
          meshRef = ref.current
        }, [])

        return (
          <mesh ref={ref} onOccluded={() => {}}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </mesh>
        )
      }

      await act(async () => {
        render(
          <Canvas>
            <TestComponent />
          </Canvas>,
        )
      })

      await advanceFrames(3)

      // The occlusionTest flag should be set on the mesh
      expect((meshRef as any)?.occlusionTest).toBe(true)
    })
  })

  //* onVisible Tests --------------------------------

  describe('onVisible', () => {
    it('fires with true when object is visible (in frustum and visible=true)', async () => {
      const handleVisible = vi.fn()

      await act(async () => {
        render(
          <Canvas>
            <mesh position={[0, 0, 0]} onVisible={handleVisible}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </Canvas>,
        )
      })

      await advanceFrames(3)

      // Object is visible: in frustum + visible=true (default) + not occluded
      expect(handleVisible).toHaveBeenCalledWith(true)
    })

    it('fires with false when object.visible is set to false', async () => {
      const handleVisible = vi.fn()
      let meshRef: THREE.Mesh | null = null

      function TestComponent() {
        const ref = useRef<THREE.Mesh>(null)

        useEffect(() => {
          meshRef = ref.current
        }, [])

        return (
          <mesh ref={ref} position={[0, 0, 0]} onVisible={handleVisible}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </mesh>
        )
      }

      await act(async () => {
        render(
          <Canvas>
            <TestComponent />
          </Canvas>,
        )
      })

      await advanceFrames(3)
      handleVisible.mockClear()

      // Set visible to false
      await act(async () => {
        if (meshRef) {
          meshRef.visible = false
        }
      })

      await advanceFrames(3)

      // Should fire with false because visible=false
      expect(handleVisible).toHaveBeenCalledWith(false)
    })

    it('fires with false when object moves out of frustum', async () => {
      const handleVisible = vi.fn()
      let meshRef: THREE.Mesh | null = null

      function TestComponent() {
        const ref = useRef<THREE.Mesh>(null)

        useEffect(() => {
          meshRef = ref.current
        }, [])

        return (
          <mesh ref={ref} position={[0, 0, 0]} onVisible={handleVisible}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </mesh>
        )
      }

      await act(async () => {
        render(
          <Canvas>
            <TestComponent />
          </Canvas>,
        )
      })

      await advanceFrames(3)
      handleVisible.mockClear()

      // Move object far away
      await act(async () => {
        if (meshRef) {
          meshRef.position.set(0, 0, 1000)
          meshRef.updateMatrixWorld()
        }
      })

      await advanceFrames(3)

      // Should fire with false because out of frustum
      expect(handleVisible).toHaveBeenCalledWith(false)
    })
  })

  //* Cleanup Tests --------------------------------

  describe('cleanup', () => {
    it('removes object from visibility registry on unmount', async () => {
      const handleFramed = vi.fn()
      let storeRef: RootState | null = null

      function StoreCapture() {
        const state = useThree()
        useEffect(() => {
          storeRef = state
        }, [state])
        return null
      }

      function TestMesh({ show }: { show: boolean }) {
        if (!show) return null
        return (
          <mesh onFramed={handleFramed}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </mesh>
        )
      }

      const { rerender } = await act(async () =>
        render(
          <Canvas>
            <StoreCapture />
            <TestMesh show={true} />
          </Canvas>,
        ),
      )

      await advanceFrames(3)

      // Verify object is registered
      expect(storeRef?.internal.visibilityRegistry.size).toBe(1)

      // Unmount the mesh
      await act(async () => {
        rerender(
          <Canvas>
            <StoreCapture />
            <TestMesh show={false} />
          </Canvas>,
        )
      })

      await advanceFrames(3)

      // Registry should be empty after unmount
      expect(storeRef?.internal.visibilityRegistry.size).toBe(0)
    })
  })

  //* Combined Handler Tests --------------------------------

  describe('multiple handlers', () => {
    it('supports all three handlers on the same object', async () => {
      const handleFramed = vi.fn()
      const handleOccluded = vi.fn()
      const handleVisible = vi.fn()

      await act(async () => {
        render(
          <Canvas>
            <mesh onFramed={handleFramed} onOccluded={handleOccluded} onVisible={handleVisible}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </Canvas>,
        )
      })

      await advanceFrames(3)

      // onFramed and onVisible should fire (object is in view)
      expect(handleFramed).toHaveBeenCalledWith(true)
      expect(handleVisible).toHaveBeenCalledWith(true)
      // onOccluded won't fire without WebGPU renderer
    })
  })
})
