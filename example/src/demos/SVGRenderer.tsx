import * as THREE from 'three'
import React, { useRef, useState } from 'react'
import { RenderProps, render, unmountComponentAtNode, useFrame, events } from '@react-three/fiber'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import mergeRefs from 'react-merge-refs'
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer'

function TorusKnot() {
  let ref = useRef<THREE.Mesh>(null!)
  let t = 0
  useFrame(() => {
    ref.current.rotation.set(t, t, t)
    t += 0.001
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry attach="geometry" args={[10, 3, 100, 16]} />
      <meshBasicMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

export default function () {
  return (
    <Canvas style={{ background: '#272730' }} camera={{ position: [0, 0, 50] }}>
      <TorusKnot />
    </Canvas>
  )
}

interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'gl'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
}

function Canvas({ children, resize, style, className, ...props }: Props) {
  const [bind, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const ref = React.useRef<HTMLDivElement>(null!)
  const [gl] = useState(() => (new SVGRenderer() as unknown) as THREE.WebGLRenderer)

  React.useLayoutEffect(() => {
    if (size.width > 0 && size.height > 0) render(children, ref.current, { ...props, size, events, gl })
  }, [gl, size, children])

  React.useEffect(() => {
    ref.current.appendChild(gl.domElement)
    return () => {
      ref.current.removeChild(gl.domElement)
      unmountComponentAtNode(ref.current)
    }
  }, [])
  return (
    <div
      ref={mergeRefs([ref, bind])}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
    />
  )
}
