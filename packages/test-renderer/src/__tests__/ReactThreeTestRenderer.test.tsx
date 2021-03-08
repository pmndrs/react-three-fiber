import * as React from 'react'
import * as THREE from 'three'

import ReactThreeTestRenderer from '../index'

describe('ReactThreeTestRenderer', () => {
  it('renders a simple component', () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    const renderer = ReactThreeTestRenderer.create(<Mesh />)

    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders an empty scene', () => {
    const Empty = () => {
      return null
    }
    const renderer = ReactThreeTestRenderer.create(<Empty />)

    expect(renderer.scene.type).toEqual('Scene')
    expect(renderer.scene.children).toEqual([])
    expect(renderer.toGraph()).toEqual([])
  })

  it('can render a composite component & correctly build simple graph', () => {
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
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = ReactThreeTestRenderer.create(<Parent />)

    expect(renderer.toGraph()).toEqual([
      {
        type: 'Group',
        name: '',
        children: [
          {
            type: 'Mesh',
            name: '',
            children: [],
          },
        ],
      },
    ])
  })

  it('renders some basics with an update', () => {
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

    const renderer = ReactThreeTestRenderer.create(<Component />)

    expect(renderer.scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  // it('updates types & names', () => {
  //   const renderer = ReactThreeTestRenderer.create(
  //     <meshBasicMaterial name="basicMat">
  //       <color attach="color" args={[0, 0, 0]} />
  //     </meshBasicMaterial>,
  //   )
  //   expect(renderer.toGraph()).toEqual({
  //     type: 'MeshBasicMaterial',
  //     name: 'basicMat',
  //     children: [],
  //   })

  //   renderer.update(
  //     <meshStandardMaterial name="standardMat">
  //       <color attach="color" args={[255, 255, 255]} />
  //     </meshStandardMaterial>,
  //   )
  //   expect(renderer.toGraph()).toEqual({
  //     type: 'MeshStandardMaterial',
  //     name: 'standardMat',
  //     children: [],
  //   })
  // })

  // it('exposes the instance', () => {
  //   class Mesh extends React.PureComponent {
  //     state = { standardMat: false }

  //     handleStandard() {
  //       this.setState({ standardMat: true })
  //     }

  //     render() {
  //       return (
  //         <mesh>
  //           <boxBufferGeometry args={[2, 2]} />
  //           {this.state.standardMat ? <meshStandardMaterial /> : <meshBasicMaterial />}
  //         </mesh>
  //       )
  //     }
  //   }
  //   const renderer = ReactThreeTestRenderer.create(<Mesh />)

  //   expect(renderer.toTree()).toEqual({
  //     type: 'mesh',
  //     props: {},
  //     children: [
  //       { type: 'boxBufferGeometry', props: { args: [2, 2] }, children: [] },
  //       {
  //         type: 'meshBasicMaterial',
  //         props: {},
  //         children: [],
  //       },
  //     ],
  //   })

  //   const mouse = renderer.getInstance()
  //   mouse.handleMoose()
  //   expect(renderer.toTree()).toEqual({
  //     type: 'mesh',
  //     props: {},
  //     children: [
  //       { type: 'boxBufferGeometry', props: { args: [2, 2] }, children: [] },
  //       {
  //         type: 'meshStandard',
  //         props: {},
  //         children: [],
  //       },
  //     ],
  //   })
  // })

  // it('updates children', () => {
  //   const renderer = ReactThreeTestRenderer.create(
  //     <group>
  //       <mesh key="a" position-z={12}>
  //         <boxBufferGeometry args={[2, 2]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //       <mesh key="b" position-y={12}>
  //         <boxBufferGeometry args={[4, 4]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //       <mesh key="c" position-x={12}>
  //         <boxBufferGeometry args={[6, 6]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //     </group>
  //   )
  //   expect(renderer.toTree()).toEqual({
  //     type: 'group',
  //     props: {},
  //     children: [
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['position-z']: 12,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['position-y']: 12,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['position-x']: 12,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //     ],
  //   })

  //   renderer.update(
  //     <group>
  //       <mesh key="d" rotate-x={1}>
  //         <boxBufferGeometry args={[2, 2]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //       <mesh key="b" position-y={12}>
  //         <boxBufferGeometry args={[4, 4]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //       <mesh key="c" position-x={12}>
  //         <boxBufferGeometry args={[6, 6]} />
  //         <meshBasicMaterial />
  //       </mesh>
  //     </group>
  //   )

  //   expect(renderer.toTree()).toEqual({
  //     type: 'group',
  //     props: {},
  //     children: [
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['rotate-x']: 1,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['position-y']: 12,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //       {
  //         type: 'mesh',
  //         props: {
  //           ['position-x']: 12,
  //         },
  //         children: [
  //           {
  //             type: 'boxBufferGeometry',
  //             props: {
  //               args: [2, 2],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //     ],
  //   })
  // })

  // it('does the full lifecycle', () => {
  //   const log: string[] = []
  //   class Log extends React.Component<{ name: string }> {
  //     render() {
  //       log.push('render ' + this.props.name)
  //       return <div />
  //     }
  //     componentDidMount() {
  //       log.push('mount ' + this.props.name)
  //     }
  //     componentWillUnmount() {
  //       log.push('unmount ' + this.props.name)
  //     }
  //   }

  //   const renderer = ReactThreeTestRenderer.create(<Log key="foo" name="Foo" />)
  //   renderer.update(<Log key="bar" name="Bar" />)
  //   renderer.unmount()

  //   expect(log).toEqual(['render Foo', 'mount Foo', 'render Bar', 'unmount Foo', 'mount Bar', 'unmount Bar'])
  // })

  // it('gives a ref to native components', () => {
  //   const log: React.ReactNode[] = []
  //   ReactThreeTestRenderer.create(<mesh ref={(r) => log.push(r)} />)
  //   expect(log).toEqual([null])
  // })

  // it('supports unmounting when using refs', () => {
  //   class Foo extends React.Component {
  //     render() {
  //       return <mesh ref="mesh" />
  //     }
  //   }
  //   const renderer = ReactThreeTestRenderer.create(<Foo />)

  //   expect(() => renderer.unmount()).not.toThrow()
  // })

  // it('supports updates when using refs', () => {
  //   const log: string[] = []
  //   class Component extends React.Component<{ useBasic: boolean }> {
  //     render() {
  //       return this.props.useBasic ? <meshBasicMaterial ref="mat" /> : <meshStandardMaterial ref="mat" />
  //     }
  //   }
  //   const renderer = ReactThreeTestRenderer.create(<Component useBasic={true} />, {
  //     createNodeMock: (element: THREE.Material) => {
  //       log.push(element.type)
  //       return element.type
  //     },
  //   })
  //   renderer.update(<Component useBasic={false} />)
  //   expect(log).toEqual(['MeshBasicMaterial', 'MeshStandardMaterial'])
  // })

  // it('toTree() handles nested Fragments', () => {
  //   const Component = () => (
  //     <>
  //       <>
  //         <group />
  //       </>
  //     </>
  //   )
  //   const renderer = ReactThreeTestRenderer.create(<Component />)

  //   expect(renderer.toTree()).toEqual({
  //     type: 'scene',
  //     props: {},
  //     children: [
  //       {
  //         type: 'group',
  //         props: {},
  //         children: [],
  //       },
  //     ],
  //   })
  // })

  // it('correctly builds a tree', () => {
  //   const Component = () => {
  //     return (
  //       <group position={[1, 2, 3]}>
  //         <Child col={[0, 0, 255]} />
  //         <Mesh />
  //         <Null />
  //       </group>
  //     )
  //   }

  //   const vertices = new Float32Array([
  //     -1.0,
  //     -1.0,
  //     1.0,
  //     1.0,
  //     -1.0,
  //     1.0,
  //     1.0,
  //     1.0,
  //     1.0,
  //     1.0,
  //     1.0,
  //     1.0,
  //     -1.0,
  //     1.0,
  //     1.0,
  //     -1.0,
  //     -1.0,
  //     1.0,
  //   ])

  //   const Mesh = () => {
  //     return (
  //       <mesh>
  //         <bufferGeometry attach="geometry">
  //           <bufferAttribute
  //             attachObject={['attributes', 'position']}
  //             array={vertices}
  //             count={vertices.length / 3}
  //             itemSize={3}
  //           />
  //         </bufferGeometry>
  //         <meshBasicMaterial attach="material" color="hotpink" />
  //       </mesh>
  //     )
  //   }

  //   const Child = ({ col }: { col: [number, number, number] }) => {
  //     return <color attach="background" args={col} />
  //   }

  //   const Null = () => {
  //     return null
  //   }

  //   const renderer = ReactThreeTestRenderer.create(<Component />)

  //   expect(renderer.toTree()).toEqual({
  //     type: 'scene',
  //     props: {},
  //     children: [
  //       {
  //         type: 'group',
  //         props: {
  //           position: [1, 2, 3],
  //         },
  //         children: [
  //           {
  //             type: 'mesh',
  //             props: {},
  //             children: [
  //               {
  //                 type: 'bufferGeometry',
  //                 props: { attach: 'geometry' },
  //                 children: [
  //                   {
  //                     type: 'bufferAttribute',
  //                     props: {
  //                       attachObject: ['attributes', 'position'],
  //                       array: vertices,
  //                       count: vertices.length / 3,
  //                       itemSize: 3,
  //                     },
  //                     children: [],
  //                   },
  //                 ],
  //               },
  //               {
  //                 type: 'meshBasicMaterial',
  //                 props: {
  //                   attach: 'material',
  //                   color: 'hotpink',
  //                 },
  //                 children: [],
  //               },
  //             ],
  //           },
  //           {
  //             type: 'color',
  //             props: {
  //               attach: 'background',
  //               args: [0, 0, 255],
  //             },
  //             children: [],
  //           },
  //         ],
  //       },
  //     ],
  //   })
  // })

  // it('toTree() handles complicated tree of fragments', () => {
  //   const renderer = ReactThreeTestRenderer.create(
  //     <>
  //       <>
  //         <group>
  //           <color attach="background" args={[0, 0, 0]} />
  //         </group>
  //         <>
  //           <group>
  //             <color attach="background" args={[0, 0, 255]} />
  //           </group>
  //         </>
  //       </>
  //       <group>
  //         <color attach="background" args={[255, 0, 0]} />
  //       </group>
  //     </>
  //   )

  //   expect(renderer.toTree()).toEqual(false)
  // })

  // it('root instance and createNodeMock ref return the same value', () => {
  //   const createNodeMock = (ref) => ({ node: ref })
  //   let refInst = null
  //   const renderer = ReactTestRenderer.create(<div ref={(ref) => (refInst = ref)} />, { createNodeMock })
  //   const root = renderer.getInstance()
  //   expect(root).toEqual(refInst)
  // })

  // it('can handle useThree hook', () => {
  //   expect(true).toBe(false)
  // })

  // it('can handle useFrame hook', () => {
  //   expect(true).toBe(false)
  // })

  // it('can handle useLoader hook', () => {
  //   expect(true).toBe(false)
  // })

  // it('can handle useResource hook', () => {
  //   expect(true).toBe(false)
  // })

  // it('can handle useUpdate hook', () => {
  //   expect(true).toBe(false)
  // })
})
