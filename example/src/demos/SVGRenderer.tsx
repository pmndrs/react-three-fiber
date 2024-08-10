import * as THREE from 'three'
import React, { useRef, useState } from 'react'
import {
  RenderProps,
  extend,
  createRoot,
  unmountComponentAtNode,
  useFrame,
  events,
  ReconcilerRoot,
} from '@react-three/fiber'
import { useMeasure, Options as ResizeOptions } from '../../../packages/fiber/src/web/use-measure'
import { SVGRenderer } from 'three-stdlib'

function TorusKnot() {
  const [hovered, hover] = useState(false)
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    const t = state.clock.elapsedTime / 2
    ref.current.rotation.set(t, t, t)
  })
  return (
    <mesh ref={ref} onPointerOver={() => hover(true)} onPointerOut={() => hover(false)}>
      <torusKnotGeometry args={[10, 3, 128, 16]} />
      <meshBasicMaterial color={hovered ? 'orange' : 'hotpink'} />
    </mesh>
  )
}

export default function () {
  return (
    <Canvas camera={{ position: [0, 0, 50] }}>
      <color attach="background" args={['#dedddf']} />
      <TorusKnot />
    </Canvas>
  )
}

interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'gl'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
}

function Canvas({ children, resize, style, className, ...props }: Props) {
  React.useMemo(() => extend(THREE), [])

  const [bind, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const ref = React.useRef<HTMLDivElement>(null!)
  React.useImperativeHandle(bind, () => ref.current, [])
  const [gl] = useState(() => new SVGRenderer() as unknown as THREE.WebGLRenderer)
  const root = React.useRef<ReconcilerRoot<HTMLElement>>(null!)

  if (size.width > 0 && size.height > 0) {
    if (!root.current) root.current = createRoot<HTMLElement>(ref.current)
    root.current.configure({ ...props, size, events, gl })
    root.current.render(children)
  }

  React.useEffect(() => {
    const container = ref.current
    container.appendChild(gl.domElement)
    return () => {
      container.removeChild(gl.domElement)
      unmountComponentAtNode(container)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
    />
  )
}
