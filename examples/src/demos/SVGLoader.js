import * as React from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { useTransition, useSpring, a } from 'react-spring/three'
import { SVGLoader as THREESVGLoader } from 'three/examples/jsm/loaders/SVGLoader'
import night from '../resources/images/svg/night.svg'
import city from '../resources/images/svg/city.svg'
import morning from '../resources/images/svg/morning.svg'
import tubes from '../resources/images/svg/tubes.svg'
import woods from '../resources/images/svg/woods.svg'
import beach from '../resources/images/svg/beach.svg'

const colors = ['#21242d', '#ea5158', '#0d4663', '#ffbcb7', '#2d4a3e', '#8bd8d2']
const spotLightPosition = [300, 300, 4000]
const scale1 = [10000, 10000, 1]
const rotation1 = [0, -0.2, 0]
const args1 = [1, 1]
const rotation2 = [0, 0, Math.PI]

function SceneComponent({ urls }) {
  const svgs = useLoader(THREESVGLoader, urls)
  const shapes = React.useMemo(
    () =>
      svgs.map(({ paths }) =>
        paths.flatMap((path, index) =>
          path
            .toShapes(true)
            .map((shape) => ({ shape, color: path.color, fillOpacity: path.userData.style.fillOpacity, index }))
        )
      ),
    [svgs]
  )

  const [page, setPage] = React.useState(0)
  React.useEffect(() => {
    const interval = window.setInterval(() => setPage((i) => (i + 1) % urls.length), 3000)
    return () => { window.clearInterval(interval) }
  }, [urls.length])

  const { color } = useSpring({
    from: { color: colors[0] },
    color: colors[page],
    delay: 500,
    config: { mass: 5, tension: 800, friction: 400 },
  })

  const transitions = useTransition(shapes[page], (item) => item.shape.uuid, {
    from: { rotation: [0, 0.4, 0], position: [-500, 0, 0], opacity: 0 },
    enter: { rotation: [0, 0, 0], position: [0, 0, 0], opacity: 1 },
    leave: { rotation: [0, -0.4, 0], position: [500, 0, 0], opacity: 0 },
    order: ['leave', 'enter', 'update'],
    config: { mass: 4, tension: 500, friction: 100 },
    trail: 5,
    lazy: true,
    unique: true,
    reset: true,
  })
  const position = React.useMemo(() => [1220, 700, page], [page])

  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight intensity={0.5} position={spotLightPosition} />
      <mesh scale={scale1} rotation={rotation1}>
        <planeBufferGeometry attach="geometry" args={args1} />
        <a.meshPhongMaterial attach="material" color={color} depthTest={false} />
      </mesh>
      <a.group position={position} rotation={rotation2}>
        {transitions.map(function mapper({
          item: { shape, color, fillOpacity, index },
          key,
          props: { opacity, position, rotation },
        }) {
          // // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
          const args = [shape] // to complex to optimize
          return (
            <a.mesh key={key} rotation={rotation} position={position.interpolate((x, y, z) => [x, y, z + index])}>
              <a.meshPhongMaterial
                attach="material"
                color={color}
                opacity={opacity.interpolate((o) => o * fillOpacity)}
                depthWrite={false}
                transparent
              />
              <shapeBufferGeometry attach="geometry" args={args} />
            </a.mesh>
          )
        })}
      </a.group>
    </>
  )
}

const Scene = React.memo(SceneComponent)

const camera = { fov: 90, position: [0, 0, 550], near: 0.1, far: 20000 }
const urls = [night, city, morning, tubes, woods, beach]

function SVGLoader() {
  const onCreated = React.useCallback(function callback({ camera }) {
    camera.lookAt(0, 0, 0)
  }, [])

  return (
    <Canvas invalidateFrameloop camera={camera} onCreated={onCreated}>
      <React.Suspense fallback={null}>
        <Scene urls={urls} />
      </React.Suspense>
    </Canvas>
  )
}

export default React.memo(SVGLoader)
