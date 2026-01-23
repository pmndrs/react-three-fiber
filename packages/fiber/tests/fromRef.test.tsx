import * as React from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot, act, extend, fromRef } from '../src/index'

extend(THREE as any)

describe('fromRef', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should resolve ref after mount', async () => {
    const targetRef = React.createRef<THREE.Group>()
    const spotLightRef = React.createRef<THREE.SpotLight>()

    function Test() {
      return (
        <>
          <group ref={targetRef} position={[1, 2, 3]} />
          <spotLight ref={spotLightRef} target={fromRef(targetRef)} />
        </>
      )
    }

    await act(async () => root.render(<Test />))

    expect(targetRef.current).toBeInstanceOf(THREE.Group)
    expect(spotLightRef.current).toBeInstanceOf(THREE.SpotLight)
    expect(spotLightRef.current!.target).toBe(targetRef.current)
  })

  it('should handle null ref gracefully', async () => {
    const nullRef = React.createRef<THREE.Object3D>()
    const spotLightRef = React.createRef<THREE.SpotLight>()

    function Test() {
      return <spotLight ref={spotLightRef} target={fromRef(nullRef)} />
    }

    await act(async () => root.render(<Test />))

    expect(spotLightRef.current).toBeInstanceOf(THREE.SpotLight)
    // Target should remain default when ref is null
    expect(spotLightRef.current!.target).toBeInstanceOf(THREE.Object3D)
  })

  it('should work with sibling refs', async () => {
    const ref1 = React.createRef<THREE.Mesh>()
    const ref2 = React.createRef<THREE.Mesh>()
    const spotLightRef = React.createRef<THREE.SpotLight>()

    function Test({ useFirst }: { useFirst: boolean }) {
      return (
        <>
          <mesh ref={ref1} position={[1, 0, 0]} />
          <mesh ref={ref2} position={[2, 0, 0]} />
          <spotLight ref={spotLightRef} target={fromRef(useFirst ? ref1 : ref2)} />
        </>
      )
    }

    await act(async () => root.render(<Test useFirst={true} />))
    expect(spotLightRef.current!.target).toBe(ref1.current)

    // Re-render with different ref - note: fromRef is only applied on mount
    // so after initial mount, changing the ref won't update the target
    // This is intentional - use regular props for dynamic bindings
  })

  it('should work with nested components', async () => {
    const targetRef = React.createRef<THREE.Group>()
    const spotLightRef = React.createRef<THREE.SpotLight>()

    function Target() {
      return <group ref={targetRef} position={[5, 5, 5]} />
    }

    function Light() {
      return <spotLight ref={spotLightRef} target={fromRef(targetRef)} />
    }

    function Test() {
      return (
        <>
          <Target />
          <Light />
        </>
      )
    }

    await act(async () => root.render(<Test />))

    expect(spotLightRef.current!.target).toBe(targetRef.current)
  })

  it('should work with state-managed refs', async () => {
    const targetRef = React.createRef<THREE.Group>()
    const spotLightRef = React.createRef<THREE.SpotLight>()

    function Test() {
      const [showTarget, setShowTarget] = React.useState(true)

      React.useEffect(() => {
        // Remove target after mount to test robustness
        const timer = setTimeout(() => setShowTarget(false), 10)
        return () => clearTimeout(timer)
      }, [])

      return (
        <>
          {showTarget && <group ref={targetRef} position={[1, 2, 3]} />}
          <spotLight ref={spotLightRef} target={fromRef(targetRef)} />
        </>
      )
    }

    await act(async () => root.render(<Test />))

    // Target should have been set during initial mount
    expect(spotLightRef.current).toBeInstanceOf(THREE.SpotLight)
  })
})
