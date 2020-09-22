import React, { createContext, useContext } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useSphere, useBox, useConeTwistConstraint, useDistanceConstraint } from 'use-cannon'

const parent = createContext()

const ChainLink = ({ children, ...props }) => {
  const parentRef = useContext(parent)
  const chainSize = [0.15, 1, 0.15]
  const [ref] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize,
    position: props.position,
  }))
  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8,
  })
  return (
    <>
      <mesh ref={ref} {...props}>
        <cylinderBufferGeometry attach="geometry" args={[chainSize[0], chainSize[0], chainSize[1], 8]} />
        <meshStandardMaterial attach="material" />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </>
  )
}

const Handle = ({ children, ...props }) => {
  const [ref, { position }] = useSphere(() => ({ type: 'Static', args: 0.5, position: [0, 0, 0] }))
  useFrame((e) => position.set((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0))
  useDistanceConstraint(ref, null, { distance: 1 })
  return (
    <group>
      <mesh ref={ref} position={props.position}>
        <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
        <meshStandardMaterial attach="material" />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </group>
  )
}

const ChainScene = () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <Handle>
          <ChainLink>
            <ChainLink>
              <ChainLink>
                <ChainLink>
                  <ChainLink>
                    <ChainLink>
                      <ChainLink />
                    </ChainLink>
                  </ChainLink>
                </ChainLink>
              </ChainLink>
            </ChainLink>
          </ChainLink>
        </Handle>
      </Physics>
    </Canvas>
  )
}

export default ChainScene
