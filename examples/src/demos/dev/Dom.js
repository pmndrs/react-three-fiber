import React, { Suspense, createRef, useEffect, useRef, useContext } from 'react'
import { Canvas, Dom, useFrame } from 'react-three-fiber'
import usePromise from 'react-promise-suspense'

/** The <Dom /> component creates its own render-root in a useEffect
 *  Why does useEffect fire before the component renders when it's wrapped in Suspense?
 *  It should put out the dom text only after the parent component has rendered
 *
 *  Refresh to restart the suspense-chain
 */

function Sphere({ children, ...props }) {
  return (
    <mesh {...props}>
      <dodecahedronBufferGeometry attach="geometry" />
      <meshStandardMaterial attach="material" roughness={0.75} emissive="#404057" />
      <Dom portal={portal}>
        <div style={{ color: 'white', transform: 'translate3d(-50%,-50%,0)', textAlign: 'center' }}>{children}</div>
      </Dom>
    </mesh>
  )
}

function Suspend({ time, ...props }) {
  usePromise((ms) => new Promise((res) => setTimeout(res, ms)), [time])
  useEffect(() => console.log(`---suspended component (${time}ms) ready`), [])
  return (
    <Sphere {...props}>
      Suspense
      <br />
      {time}ms
    </Sphere>
  )
}

function Content() {
  const ref = useRef()
  useFrame(() => (ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z += 0.025))
  return (
    <group ref={ref}>
      <Suspend time={500} position={[-2, 0, 0]} />
      <Suspend time={1000} position={[0, -2, 0]} />
      <Suspend time={1500} position={[2, 0, 0]} />
      <Sphere position={[0, 2, 0]}>No suspense</Sphere>
    </group>
  )
}

const portal = createRef()
export default function () {
  return (
    <>
      <Canvas concurrent style={{ background: '#272730' }} orthographic camera={{ zoom: 100 }}>
        <pointLight color="indianred" />
        <pointLight position={[10, 10, -10]} color="orange" />
        <pointLight position={[-10, -10, 10]} color="lightblue" />
        <Suspense fallback={<Sphere>Fallback</Sphere>}>
          <Content />
        </Suspense>
      </Canvas>
      <div ref={portal} />
    </>
  )
}
