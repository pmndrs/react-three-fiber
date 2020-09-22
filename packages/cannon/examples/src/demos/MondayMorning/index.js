import React, {
  Suspense,
  createRef,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { Canvas, useFrame, useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import {
  Physics,
  useBox,
  useCompoundBody,
  useCylinder,
  useSphere,
  usePlane,
  useConeTwistConstraint,
  usePointToPointConstraint,
} from 'use-cannon'
import { createRagdoll } from './createConfig'

const { shapes, joints } = createRagdoll(4.8, Math.PI / 16, Math.PI / 16, 0)
const context = createContext()
const cursor = createRef()

function useDragConstraint(child) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0] })
  useEffect(() => void api.disable(), [])
  const onPointerUp = useCallback((e) => api.disable(), [])
  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  return { onPointerUp, onPointerDown }
}

const BodyPart = ({ config, children, render, name, ...props }) => {
  const { color, args, mass, position } = shapes[name]
  const scale = useMemo(() => args.map((s) => s * 2), [args])
  const parent = useContext(context)
  const [ref] = useBox(() => ({ mass, args, position, linearDamping: 0.99 }))
  useConeTwistConstraint(ref, parent, config)
  const bind = useDragConstraint(ref)
  return (
    <context.Provider value={ref}>
      <Box castShadow receiveShadow ref={ref} {...props} {...bind} scale={scale} name={name} color={color}>
        {render}
      </Box>
      {children}
    </context.Provider>
  )
}

function Ragdoll(props) {
  const mouth = useRef()
  const eyes = useRef()
  const [ref, api] = useSphere(() => ({ type: 'Static', args: [0.5], position: [0, 0, 10000] }), cursor)
  useFrame((e) => {
    eyes.current.position.y = Math.sin(e.clock.getElapsedTime() * 1) * 0.06
    mouth.current.scale.y = (1 + Math.sin(e.clock.getElapsedTime())) * 1.5
    const x = (e.mouse.x * e.viewport.width) / e.camera.zoom
    const y = (e.mouse.y * e.viewport.height) / e.camera.zoom / 1.9 + -x / 3.5
    api.position.set(x / 1.4, y, 0)
  })
  return (
    <BodyPart name={'upperBody'} {...props}>
      <mesh ref={ref}>
        <sphereBufferGeometry attach="geometry" args={[0.5, 32, 32]} />
        <meshBasicMaterial attach="material" fog={false} depthTest={false} transparent opacity={0.5} />
      </mesh>
      <BodyPart
        {...props}
        name={'head'}
        config={joints['neckJoint']}
        render={
          <>
            <group ref={eyes}>
              <Box
                position={[-0.3, 0.1, 0.5]}
                args={[0.3, 0.01, 0.1]}
                color="black"
                transparent
                opacity={0.8}
              />
              <Box
                position={[0.3, 0.1, 0.5]}
                args={[0.3, 0.01, 0.1]}
                color="black"
                transparent
                opacity={0.8}
              />
            </group>
            <Box
              ref={mouth}
              position={[0, -0.2, 0.5]}
              args={[0.3, 0.05, 0.1]}
              color="#270000"
              transparent
              opacity={0.8}
            />
          </>
        }
      />
      <BodyPart {...props} name={'upperLeftArm'} config={joints['leftShoulder']}>
        <BodyPart {...props} name={'lowerLeftArm'} config={joints['leftElbowJoint']} />
      </BodyPart>
      <BodyPart {...props} name={'upperRightArm'} config={joints['rightShoulder']}>
        <BodyPart {...props} name={'lowerRightArm'} config={joints['rightElbowJoint']} />
      </BodyPart>
      <BodyPart {...props} name={'pelvis'} config={joints['spineJoint']}>
        <BodyPart {...props} name={'upperLeftLeg'} config={joints['leftHipJoint']}>
          <BodyPart {...props} name={'lowerLeftLeg'} config={joints['leftKneeJoint']} />
        </BodyPart>
        <BodyPart {...props} name={'upperRightLeg'} config={joints['rightHipJoint']}>
          <BodyPart {...props} name={'lowerRightLeg'} config={joints['rightKneeJoint']} />
        </BodyPart>
      </BodyPart>
    </BodyPart>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshStandardMaterial attach="material" color="#171720" />
    </mesh>
  )
}

const Box = React.forwardRef(
  ({ children, transparent = false, opacity = 1, color = 'white', args = [1, 1, 1], ...props }, ref) => {
    return (
      <mesh receiveShadow castShadow ref={ref} {...props}>
        <boxBufferGeometry attach="geometry" args={args} />
        <meshStandardMaterial attach="material" color={color} transparent={transparent} opacity={opacity} />
        {children}
      </mesh>
    )
  }
)

function Chair() {
  const [ref] = useCompoundBody(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [-6, 0, 0],
    shapes: [
      { type: 'Box', mass: 1, position: [0, 0, 0], args: [1.5, 1.5, 0.25] },
      { type: 'Box', mass: 1, position: [0, -1.75, 1.25], args: [1.5, 0.25, 1.5] },
      { type: 'Box', mass: 10, position: [5 + -6.25, -3.5, 0], args: [0.25, 1.5, 0.25] },
      { type: 'Box', mass: 10, position: [5 + -3.75, -3.5, 0], args: [0.25, 1.5, 0.25] },
      { type: 'Box', mass: 10, position: [5 + -6.25, -3.5, 2.5], args: [0.25, 1.5, 0.25] },
      { type: 'Box', mass: 10, position: [5 + -3.75, -3.5, 2.5], args: [0.25, 1.5, 0.25] },
    ],
  }))
  const bind = useDragConstraint(ref)
  return (
    <group ref={ref} {...bind}>
      <Box position={[0, 0, 0]} scale={[3, 3, 0.5]} />
      <Box position={[0, -1.75, 1.25]} scale={[3, 0.5, 3]} />
      <Box position={[5 + -6.25, -3.5, 0]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -3.75, -3.5, 0]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -6.25, -3.5, 2.5]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -3.75, -3.5, 2.5]} scale={[0.5, 3, 0.5]} />
    </group>
  )
}

//radiusTop, radiusBottom, height, numSegments
function Mug() {
  const { nodes, materials } = useLoader(GLTFLoader, '/cup.glb')
  const [cup] = useCylinder(() => ({
    mass: 1,
    rotation: [Math.PI / 2, 0, 0],
    position: [9, 0, 0],
    args: [0.6, 0.6, 1, 16],
  }))
  const bind = useDragConstraint(cup)
  return (
    <group ref={cup} {...bind} dispose={null}>
      <group scale={[0.01, 0.01, 0.01]}>
        <mesh
          receiveShadow
          castShadow
          material={materials.default}
          geometry={nodes['buffer-0-mesh-0_0'].geometry}
        />
        <mesh
          receiveShadow
          castShadow
          material={materials.Liquid}
          geometry={nodes['buffer-0-mesh-0_1'].geometry}
        />
      </group>
    </group>
  )
}

function Table() {
  const [seat] = useBox(() => ({ type: 'Static', position: [9, -0.8, 0], args: [2.5, 0.25, 2.5] }))
  const [leg1] = useBox(() => ({ type: 'Static', position: [7.2, -3, 1.8], args: [0.25, 2, 0.25] }))
  const [leg2] = useBox(() => ({ type: 'Static', position: [10.8, -3, 1.8], args: [0.25, 2, 0.25] }))
  const [leg3] = useBox(() => ({ type: 'Static', position: [7.2, -3, -1.8], args: [0.25, 2, 0.25] }))
  const [leg4] = useBox(() => ({ type: 'Static', position: [10.8, -3, -1.8], args: [0.25, 2, 0.25] }))
  return (
    <>
      <Box scale={[5, 0.5, 5]} ref={seat} />
      <Box scale={[0.5, 4, 0.5]} ref={leg1} />
      <Box scale={[0.5, 4, 0.5]} ref={leg2} />
      <Box scale={[0.5, 4, 0.5]} ref={leg3} />
      <Box scale={[0.5, 4, 0.5]} ref={leg4} />
      <Suspense fallback={null}>
        <Mug />
      </Suspense>
    </>
  )
}

const Lamp = () => {
  const light = useRef()
  const [fixed] = useSphere(() => ({ type: 'Static', args: 1, position: [0, 16, 0] }))
  const [lamp] = useBox(() => ({
    mass: 1,
    args: [1, 0, 5, 1],
    linearDamping: 0.9,
    angulardamping: 1.99,
    position: [0, 16, 0],
  }))
  usePointToPointConstraint(fixed, lamp, { pivotA: [0, 0, 0], pivotB: [0, 2, 0] })
  const bind = useDragConstraint(lamp)
  return (
    <>
      <mesh ref={lamp} {...bind}>
        <coneBufferGeometry attach="geometry" args={[2, 2.5, 32]} />
        <meshStandardMaterial attach="material" />
        <pointLight intensity={10} distance={5} />
        <spotLight ref={light} position={[0, 20, 0]} angle={0.4} penumbra={1} intensity={0.6} castShadow />
      </mesh>
    </>
  )
}

export default () => (
  <Canvas
    style={{ cursor: 'none' }}
    sRGB
    shadowMap
    orthographic
    camera={{ position: [-25, 20, 25], zoom: 25, near: 1, far: 100 }}>
    <color attach="background" args={['#171720']} />
    <fog attach="fog" args={['#171720', 20, 70]} />
    <ambientLight intensity={0.2} />
    <pointLight position={[-10, -10, -10]} color="red" intensity={1.5} />
    <Physics iterations={15} gravity={[0, -200, 0]} allowSleep={false}>
      <Ragdoll position={[0, 0, 0]} />
      <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Chair />
      <Table />
      <Lamp />
    </Physics>
  </Canvas>
)
