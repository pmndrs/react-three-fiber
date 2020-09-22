[![Build Status](https://travis-ci.org/react-spring/use-cannon.svg?branch=master)](https://travis-ci.org/react-spring/use-cannon) [![npm version](https://badge.fury.io/js/use-cannon.svg)](https://badge.fury.io/js/use-cannon) ![npm](https://img.shields.io/npm/dt/use-cannon.svg)

![Imgur](https://imgur.com/FpBsJPL.jpg)

    yarn add use-cannon

Experimental React hooks for [cannon](https://github.com/schteppe/cannon.js). Use this in combination with [react-three-fiber](https://github.com/react-spring/react-three-fiber).

- [x] Doesn't block the main thread, runs in a web worker
- [x] Supports instancing out of the box
- [x] Least amount of friction you'll ever experience with a physics rig ... 🙈

## Demos

Ping pong: https://codesandbox.io/s/white-resonance-0mgum

Cube pushing spheres away: https://codesandbox.io/s/r3f-cannon-instanced-physics-devf8

Heap of cubes: https://codesandbox.io/s/r3f-cannon-instanced-physics-g1s88

## How it works

1. Get all the imports that you need.

```jsx
import { Physics, useBox, ... } from 'use-cannon'
```

2. Create a physics world.

```jsx
<Physics>{/* Physics related objects in here please */}</Physics>
```

3. Pick a shape that suits your objects contact surface, it could be a box, plane, sphere, etc. Give it a mass, too.

```jsx
const [ref, api] = useBox(() => ({ mass: 1 }))
```

4. Take your object, it could be a mesh, line, gltf, anything, and tie it to the reference you have just received. Et voilà, it will now be affected by gravity and other objects inside the physics world.

```jsx
<mesh ref={ref} geometry={...} material={...} />
```

5. You can interact with it by using [the api](#returned-api), which lets you apply positions, rotations, velocities, forces and impulses.

```jsx
useFrame(({ clock }) => api.position.set(Math.sin(clock.getElapsedTime()) * 5, 0, 0))
```

6. You can use the body api to subscribe to properties to get updates on each frame.

```jsx
const velocity = useRef([0, 0, 0])
useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [])
```

## Simple example

Let's make a cube falling onto a plane. You can play with a sandbox [here](https://codesandbox.io/s/r3f-cannon-instanced-physics-l40oh).

```jsx
import { Canvas } from 'react-three-fiber'
import { Physics, usePlane, useBox } from 'use-cannon'

function Plane(props) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh ref={ref}>
      <planeBufferGeometry attach="geometry" args={[100, 100]} />
    </mesh>
  )
}

function Cube(props) {
  const [ref] = useBox(() => ({ mass: 1, position: [0, 5, 0], ...props }))
  return (
    <mesh ref={ref}>
      <boxBufferGeometry attach="geometry" />
    </mesh>
  )
}

ReactDOM.render(
  <Canvas>
    <Physics>
      <Plane />
      <Cube />
    </Physics>
  </Canvas>,
  document.getElementById('root')
)
```

## Api

### Exports

```typescript
function Physics({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  allowSleep = false,
  broadphase = 'Naive',
  axisIndex = 0,
  defaultContactMaterial = {
    contactEquationStiffness: 1e6,
  },
  // Maximum amount of physics objects inside your scene
  // Lower this value to save memory, increase if 1000 isn't enough
  size = 1000,
}: ProviderProps): JSX.Element

function usePlane(fn: PlaneFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useBox(fn: BoxFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useCylinder(fn: CylinderFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useHeightfield(fn: HeightfieldFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useParticle(fn: ParticleFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useSphere(fn: SphereFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useTrimesh(fn: TrimeshFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useConvexPolyhedron(fn: ConvexPolyhedronFn, ref?: React.MutableRefObject<THREE.Object3D>): Api
function useCompoundBody(fn: CompoundBodyFn, ref?: React.MutableRefObject<THREE.Object3D>): Api

function usePointToPointConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: PointToPointConstraintOpts,
  deps: any[] = []
): ConstraintApi

function useConeTwistConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: ConeTwistConstraintOpts,
  deps: any[] = []
): ConstraintApi

function useDistanceConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: DistanceConstraintOpts,
  deps: any[] = []
): ConstraintApi

function useHingeConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: HingeConstraintOpts,
  deps: any[] = []
): ConstraintApi

function useLockConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: LockConstraintOpts,
  deps: any[] = []
): ConstraintApi

function useSpring(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: SpringOptns,
  deps: any[] = []
): void
```

### Returned api

```typescript
type WorkerApi = WorkerProps<AtomicProps> & {
  position: WorkerVec
  rotation: WorkerVec
  velocity: WorkerVec
  angularVelocity: WorkerVec
  linearFactor: WorkerVec
  angularFactor: WorkerVec
  applyForce: (force: number[], worldPoint: number[]) => void
  applyImpulse: (impulse: number[], worldPoint: number[]) => void
  applyLocalForce: (force: number[], localPoint: number[]) => void
  applyLocalImpulse: (impulse: number[], localPoint: number[]) => void
}

type Api = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  WorkerApi & {
    at: (index: number) => WorkerApi
  }
]

type ConstraintApi = [
  React.MutableRefObject<THREE.Object3D>,
  React.MutableRefObject<THREE.Object3D>,
  {
    enable: () => void
    disable: () => void
  }
]
```

### Props

```typescript
type ProviderProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
  allowSleep?: boolean
  broadphase?: 'Naive' | 'SAP'
  axisIndex?: number
  defaultContactMaterial?: {
    friction?: number
    restitution?: number
    contactEquationStiffness?: number
    contactEquationRelaxation?: number
    frictionEquationStiffness?: number
    frictionEquationRelaxation?: number
  }
  size?: number
}

type AtomicProps = {
  mass?: number
  material?: { friction?: number; restitution?: number }
  linearDamping?: number
  angularDamping?: number
  allowSleep?: boolean
  sleepSpeedLimit?: number
  sleepTimeLimit?: number
  collisionFilterGroup?: number
  collisionFilterMask?: number
  fixedRotation?: boolean
}

type BodyProps = AtomicProps & {
  args?: any
  position?: number[]
  rotation?: number[]
  velocity?: number[]
  angularVelocity?: number[]
  linearFactor?: number[]
  angularFactor?: number[]
  type?: 'Dynamic' | 'Static' | 'Kinematic'
  onCollide?: (e: Event) => void
}

type Event = {
  op: string
  type: string
  body: THREE.Object3D
  target: THREE.Object3D
  contact: {
    ni: number[]
    ri: number[]
    rj: number[]
    impactVelocity: number
  }
  collisionFilters: {
    bodyFilterGroup: number
    bodyFilterMask: number
    targetFilterGroup: number
    targetFilterMask: number
  }
}

type PlaneProps = BodyProps & {}
type ParticleProps = BodyProps & {}
type BoxProps = BodyProps & {
  args?: number[] // extents: [x, y, z]
}
type CylinderProps = BodyProps & {
  args?: [number, number, number, number] // radiusTop, radiusBottom, height, numSegments
}
type SphereProps = BodyProps & {
  args?: number // radius
}
type TrimeshProps = BodyProps & {
  args?: [number[][], number[][]] // vertices: [[x, y, z], ...], indices: [[a, b, c], ...]
}
type ConvexPolyhedronProps = BodyProps & {
  args?:
    | THREE.Geometry
    // vertices: [[x, y, z], ...], faces: [[a, b, c], ...]
    | [(THREE.Vector3 | number[])[], (THREE.Face3 | number[])[]]
}
type HeightfieldProps = BodyProps & {
  args?: [
    number[], // data
    {
      minValue?: number
      maxValue?: number
      elementSize?: number
    }
  ]
}
type CompoundBodyProps = BodyProps & {
  shapes: {
    type: ShapeType
    args?: any
    position?: number[]
    rotation?: number[]
  }[]
}

type PlaneFn = (index: number) => PlaneProps
type BoxFn = (index: number) => BoxProps
type CylinderFn = (index: number) => CylinderProps
type HeightfieldFn = (index: number) => HeightfieldProps
type ParticleFn = (index: number) => ParticleProps
type SphereFn = (index: number) => SphereProps
type TrimeshFn = (index: number) => TrimeshProps
type ConvexPolyhedronFn = (index: number) => ConvexPolyhedronProps
type CompoundBodyFn = (index: number) => CompoundBodyProps

type ConstraintOptns = { maxForce?: number; collideConnected?: boolean; wakeUpBodies?: boolean }

type PointToPointConstraintOpts = ConstraintOptns & {
  pivotA: number[]
  pivotB: number[]
}

type ConeTwistConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
  angle?: number
  twistAngle?: number
}
type DistanceConstraintOpts = ConstraintOptns & { distance?: number }

type HingeConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
}

type LockConstraintOpts = ConstraintOptns & {}

type SpringOptns = {
  restLength?: number
  stiffness?: number
  damping?: number
  worldAnchorA?: number[]
  worldAnchorB?: number[]
  localAnchorA?: number[]
  localAnchorB?: number[]
}
```

### FAQ

#### Broadphases

- NaiveBroadphase is as simple as it gets. It considers every body to be a potential collider with every other body. This results in the maximum number of narrowphase checks.
- SAPBroadphase sorts bodies along an axis and then moves down that list finding pairs by looking at body size and position of the next bodies. Control what axis to sort along by setting the axisIndex property.

#### Types

- A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
- A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
- A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
