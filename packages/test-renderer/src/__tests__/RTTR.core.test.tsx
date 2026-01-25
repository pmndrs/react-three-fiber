import { useFrame } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'

import ReactThreeTestRenderer from '../index'

type ExampleComp = THREE.Mesh<THREE.BoxGeometry, THREE.Material>

describe('ReactThreeTestRenderer Core', () => {
  it('renders JSX', async () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<Mesh />)
    expect(renderer.scene.children[0].type).toEqual('Mesh')
    await renderer.update(<Mesh />)
    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders a simple component with hooks', async () => {
    const Mesh = () => {
      const meshRef = React.useRef<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>>(null)
      useFrame(() => void (meshRef.current!.position.x += 0.01))
      return (
        <mesh>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<Mesh />)
    expect(renderer.scene.children[0].type).toEqual('Mesh')
    await renderer.update(<Mesh />)
    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders a simple component with useTransition', async () => {
    const Mesh = () => {
      const [name, setName] = React.useState<string>()

      React.useLayoutEffect(() => {
        React.startTransition(() => void setName('mesh'))
      })

      return (
        <mesh name={name}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    const renderer = await ReactThreeTestRenderer.create(
      <React.Suspense fallback={null}>
        <Mesh />
      </React.Suspense>,
    )

    expect(renderer.scene.children[0].props.name).toEqual('mesh')
  })

  it('renders an empty scene', async () => {
    const Empty = () => {
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(<Empty />)

    expect(renderer.scene.type).toEqual('Scene')
    expect(renderer.scene.children).toEqual([])
    expect(renderer.toGraph()).toEqual([])
  })

  it('can render a composite component & correctly build simple graph', async () => {
    class Parent extends React.Component {
      render() {
        return (
          <group>
            <color attach="background" args={[0, 0, 0]} />
            <Child />
          </group>
        )
      }
    }

    const Child = () => {
      return (
        <mesh>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<Parent />)

    expect(renderer.toGraph()).toMatchSnapshot()
  })

  it('renders some basics with an update', async () => {
    let renders = 0

    class Component extends React.PureComponent {
      state = {
        pos: 3,
      }

      componentDidMount() {
        this.setState({
          pos: 7,
        })
      }

      render() {
        renders++
        return (
          <group position-x={this.state.pos}>
            <Child />
            <Null />
          </group>
        )
      }
    }

    const Child = () => {
      renders++
      return <color attach="background" args={[0, 0, 0]} />
    }

    const Null = () => {
      renders++
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<Component />)

    expect(renderer.scene.children[0].instance.position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <mesh>
        <meshBasicMaterial name="basicMat">
          <color attach="color" args={[0, 0, 0]} />
        </meshBasicMaterial>
      </mesh>,
    )

    let childInstance = renderer.scene.children[0].instance as ExampleComp

    expect(childInstance.material.type).toEqual('MeshBasicMaterial')
    expect(childInstance.material.name).toEqual('basicMat')

    await renderer.update(
      <mesh>
        <meshStandardMaterial name="standardMat">
          <color attach="color" args={[255, 255, 255]} />
        </meshStandardMaterial>
      </mesh>,
    )

    childInstance = renderer.scene.children[0].instance as ExampleComp

    expect(childInstance.material.type).toEqual('MeshStandardMaterial')
    expect(childInstance.material.name).toEqual('standardMat')
  })

  it('exposes the instance', async () => {
    class Instance extends React.PureComponent {
      state = { standardMat: false }

      handleStandard() {
        this.setState({ standardMat: true })
      }

      render() {
        return (
          <mesh>
            <boxGeometry args={[2, 2]} />
            {this.state.standardMat ? <meshStandardMaterial /> : <meshBasicMaterial />}
          </mesh>
        )
      }
    }

    const renderer = await ReactThreeTestRenderer.create(<Instance />)

    expect(renderer.toTree()).toMatchSnapshot()

    const instance = renderer.getInstance() as Instance

    await ReactThreeTestRenderer.act(async () => {
      instance.handleStandard()
    })

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('updates children', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <group>
        <mesh key="a" position-z={12}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="b" position-y={12}>
          <boxGeometry args={[4, 4]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="c" position-x={12}>
          <boxGeometry args={[6, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>,
    )

    expect(renderer.toTree()).toMatchSnapshot()

    await renderer.update(
      <group>
        <mesh key="d" rotation-x={1}>
          <boxGeometry args={[6, 6]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="b" position-y={12}>
          <boxGeometry args={[4, 4]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="c" position-x={12}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      </group>,
    )

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('does the full lifecycle', async () => {
    const log: string[] = []
    class Log extends React.Component<{ name: string }> {
      render() {
        log.push('render ' + this.props.name)
        return (
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshStandardMaterial />
          </mesh>
        )
      }
      componentDidMount() {
        log.push('mount ' + this.props.name)
      }
      componentWillUnmount() {
        log.push('unmount ' + this.props.name)
      }
    }

    const renderer = await ReactThreeTestRenderer.create(<Log key="foo" name="Foo" />)
    await renderer.update(<Log key="bar" name="Bar" />)
    await renderer.unmount()

    expect(log).toEqual(['render Foo', 'mount Foo', 'render Bar', 'unmount Foo', 'mount Bar', 'unmount Bar'])
  })

  it('gives a ref to native components', async () => {
    const log: THREE.Mesh[] = []
    await ReactThreeTestRenderer.create(
      <mesh
        ref={(r) => {
          log.push(r as THREE.Mesh)
        }}
      />,
    )
    expect(log).toHaveLength(1)

    expect(log[0].type).toEqual('Mesh')
  })

  it('toTree() handles nested Fragments', async () => {
    const Component = () => (
      <>
        <>
          <group />
        </>
      </>
    )
    const renderer = await ReactThreeTestRenderer.create(<Component />)

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('correctly builds a tree', async () => {
    const Component = () => {
      return (
        <group position={[1, 2, 3]}>
          <Child col={[0, 0, 255]} />
          <Mesh />
          <Null />
        </group>
      )
    }

    const vertices = new Float32Array([
      -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0,
    ])

    const Mesh = () => {
      return (
        <mesh>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          </bufferGeometry>
          <meshBasicMaterial attach="material" color="hotpink" />
        </mesh>
      )
    }

    const Child = ({ col }: { col: [number, number, number] }) => {
      return <color attach="background" args={col} />
    }

    const Null = () => {
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<Component />)

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('toTree() handles complicated tree of fragments', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <>
        <>
          <group>
            <color attach="background" args={[0, 0, 0]} />
          </group>
          <>
            <group>
              <color attach="background" args={[0, 0, 255]} />
            </group>
          </>
        </>
        <group>
          <color attach="background" args={[255, 0, 0]} />
        </group>
      </>,
    )

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('correctly searches through multiple levels in regular objects', async () => {
    // Create a deep tree: group -> mesh -> mesh -> mesh
    const renderer = await ReactThreeTestRenderer.create(
      <group name="root-group">
        <mesh name="level1-mesh">
          <boxGeometry />
          <meshBasicMaterial color="red" />
          <mesh name="level2-mesh">
            <boxGeometry />
            <meshBasicMaterial color="green" />
            <mesh name="level3-mesh">
              <boxGeometry />
              <meshBasicMaterial color="blue" />
            </mesh>
          </mesh>
        </mesh>
      </group>,
    )

    // Test from the root
    const allMeshes = renderer.scene.findAllByType('Mesh')
    expect(allMeshes).toHaveLength(3) // Should find all three meshes

    // Test from an intermediate node
    const topMesh = renderer.scene.find((node) => node.props.name === 'level1-mesh')
    const nestedMeshes = topMesh.findAllByType('Mesh')
    expect(nestedMeshes).toHaveLength(2) // Should find the two nested meshes

    // Find a deeply nested mesh from an intermediate node by property
    const level3 = topMesh.find((node) => node.props.name === 'level3-mesh')
    expect(level3).toBeDefined()
    expect(level3.type).toBe('Mesh')
  })

  it('Can search from retrieved primitive Instance', async () => {
    const group = new THREE.Group()
    group.name = 'PrimitiveGroup'

    const childMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'red' }))
    childMesh.name = 'PrimitiveChildMesh'
    group.add(childMesh)

    const nestedMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'red' }))
    nestedMesh.name = 'PrimitiveNestedChildMesh'
    childMesh.add(nestedMesh)

    const renderer = await ReactThreeTestRenderer.create(<primitive object={group} />)

    const foundGroup = renderer.scene.findByType('Group')
    const foundMesh = foundGroup.children[0]
    const foundNestedMesh = foundMesh.findByType('Mesh')
    expect(foundNestedMesh).toBeDefined()
  })

  it('root instance and refs return the same value', async () => {
    let refInst = null
    const renderer = await ReactThreeTestRenderer.create(
      <mesh
        ref={(ref) => {
          refInst = ref
        }}
      />,
    )
    const root = renderer.getInstance() // this will be Mesh
    expect(root).toEqual(refInst)
  })

  it('handles primitive objects and their children correctly in toGraph', async () => {
    // Create a component with both regular objects and primitives with children
    const PrimitiveTestComponent = () => {
      // Create a THREE.js group with mesh children
      const group = new THREE.Group()
      group.name = 'PrimitiveGroup'

      const childMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'red' }))
      childMesh.name = 'PrimitiveChildMesh'
      group.add(childMesh)

      // Add a nested group to test deeper hierarchies
      const nestedGroup = new THREE.Group()
      nestedGroup.name = 'NestedGroup'
      const nestedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 'blue' }))
      nestedMesh.name = 'NestedMesh'
      nestedGroup.add(nestedMesh)
      group.add(nestedGroup)

      return (
        <>
          <mesh name="RegularMesh">
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>

          <primitive object={group} />
        </>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<PrimitiveTestComponent />)

    expect(renderer.toGraph()).toMatchSnapshot()
  })
})
