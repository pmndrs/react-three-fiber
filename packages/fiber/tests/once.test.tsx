import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot, extend, once } from '../src/index'
import { isOnce } from '../src/core/utils/once'

extend(THREE)

describe('once', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should call method only on mount', async () => {
    const boxRef = React.createRef<THREE.BoxGeometry>()
    const rotateXSpy = vi.fn()

    // Create a custom geometry to track calls
    class TrackedBoxGeometry extends THREE.BoxGeometry {
      rotateX(angle: number) {
        rotateXSpy(angle)
        return super.rotateX(angle)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test({ counter }: { counter: number }) {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry ref={boxRef} args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test counter={0} />))
    expect(rotateXSpy).toHaveBeenCalledTimes(1)
    expect(rotateXSpy).toHaveBeenCalledWith(Math.PI / 2)

    // Re-render should NOT call rotateX again
    await act(async () => root.render(<Test counter={1} />))
    expect(rotateXSpy).toHaveBeenCalledTimes(1)

    // Re-render again
    await act(async () => root.render(<Test counter={2} />))
    expect(rotateXSpy).toHaveBeenCalledTimes(1)
  })

  it('should reapply when args change (reconstruction)', async () => {
    const rotateXSpy = vi.fn()

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      rotateX(angle: number) {
        rotateXSpy(angle)
        return super.rotateX(angle)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test({ size }: { size: number }) {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[size, size, size]} rotateX={once(Math.PI / 2)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test size={1} />))
    expect(rotateXSpy).toHaveBeenCalledTimes(1)

    // Changing args causes reconstruction - new instance, once() applied again
    await act(async () => root.render(<Test size={2} />))
    expect(rotateXSpy).toHaveBeenCalledTimes(2)
  })

  it('should work with multiple arguments', async () => {
    const translateSpy = vi.fn()

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      translate(x: number, y: number, z: number) {
        translateSpy(x, y, z)
        return super.translate(x, y, z)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test() {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[1, 1, 1]} translate={once(1, 2, 3)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))
    expect(translateSpy).toHaveBeenCalledTimes(1)
    expect(translateSpy).toHaveBeenCalledWith(1, 2, 3)
  })

  it('should work with no arguments', async () => {
    const centerSpy = vi.fn()

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      center() {
        centerSpy()
        return super.center()
      }
    }
    extend({ TrackedBoxGeometry })

    function Test() {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[1, 1, 1]} center={once()} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))
    expect(centerSpy).toHaveBeenCalledTimes(1)
  })

  it('should work with multiple once() props', async () => {
    const rotateXSpy = vi.fn()
    const rotateYSpy = vi.fn()

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      rotateX(angle: number) {
        rotateXSpy(angle)
        return super.rotateX(angle)
      }
      rotateY(angle: number) {
        rotateYSpy(angle)
        return super.rotateY(angle)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test() {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 4)} rotateY={once(Math.PI / 2)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))
    expect(rotateXSpy).toHaveBeenCalledTimes(1)
    expect(rotateYSpy).toHaveBeenCalledTimes(1)
    expect(rotateXSpy).toHaveBeenCalledWith(Math.PI / 4)
    expect(rotateYSpy).toHaveBeenCalledWith(Math.PI / 2)
  })

  it('should apply Matrix4 transformation', async () => {
    const applyMatrix4Spy = vi.fn()
    const matrix = new THREE.Matrix4().makeTranslation(1, 2, 3)

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      applyMatrix4(m: THREE.Matrix4) {
        applyMatrix4Spy(m)
        return super.applyMatrix4(m)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test() {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[1, 1, 1]} applyMatrix4={once(matrix)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))
    expect(applyMatrix4Spy).toHaveBeenCalledTimes(1)
    expect(applyMatrix4Spy).toHaveBeenCalledWith(matrix)
  })

  it('should apply Quaternion rotation', async () => {
    const applyQuaternionSpy = vi.fn()
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))

    class TrackedBoxGeometry extends THREE.BoxGeometry {
      applyQuaternion(q: THREE.Quaternion) {
        applyQuaternionSpy(q)
        return super.applyQuaternion(q)
      }
    }
    extend({ TrackedBoxGeometry })

    function Test() {
      return (
        <mesh>
          {/* @ts-ignore */}
          <trackedBoxGeometry args={[1, 1, 1]} applyQuaternion={once(quaternion)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))
    expect(applyQuaternionSpy).toHaveBeenCalledTimes(1)
    expect(applyQuaternionSpy).toHaveBeenCalledWith(quaternion)
  })

  it('should work on actual BufferGeometry', async () => {
    const geometryRef = React.createRef<THREE.BoxGeometry>()

    function Test() {
      return (
        <mesh>
          <boxGeometry ref={geometryRef} args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))

    // Verify the geometry was rotated by checking bounding box
    const geometry = geometryRef.current!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    // Original box would have y range [-0.5, 0.5]
    // After 90-degree X rotation, the z extent becomes the y extent
    // So y should now be approximately [-0.5, 0.5] and z should be [-0.5, 0.5]
    expect(Math.abs(box.min.y + 0.5)).toBeLessThan(0.01)
    expect(Math.abs(box.max.y - 0.5)).toBeLessThan(0.01)
  })

  it('is typed as the value the prop declares', () => {
    // The runtime value is always the marker; the declared type follows the prop, so a
    // multi-argument call is a tuple and a bare call is `true` — no cast at the call site.
    const single: number = once(Math.PI / 2)
    const tuple: [x: number, y: number, z: number] = once(1, 2, 3)
    const bare: true = once()
    const matrix: THREE.Matrix4 = once(new THREE.Matrix4())
    // @ts-expect-error a multi-argument call is the argument tuple, not its first element
    const wrong: number = once(1, 2, 3)

    for (const marker of [single, tuple, bare, matrix, wrong]) expect(isOnce(marker)).toBe(true)
  })

  it('typechecks against the geometry transform props', async () => {
    const geometryRef = React.createRef<THREE.BoxGeometry>()

    function Test() {
      return (
        <mesh>
          <boxGeometry ref={geometryRef} args={[1, 1, 1]} translate={once(0, 5, 0)} center={once()} />
        </mesh>
      )
    }

    await act(async () => root.render(<Test />))

    // translate then center: the box ends up centered again
    const geometry = geometryRef.current!
    geometry.computeBoundingBox()
    expect(Math.abs(geometry.boundingBox!.min.y + 0.5)).toBeLessThan(0.01)
  })
})
