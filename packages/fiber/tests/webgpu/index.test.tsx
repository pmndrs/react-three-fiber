/**
 * @fileoverview Comprehensive WebGPU hook tests
 *
 * Tests for WebGPU-specific hooks: useUniform, useUniforms, useNodes, useLocalNodes
 * Uses real TSL imports with simple operations (colors, uniforms, basic nodes).
 *
 * NOTE: Jest tests run against SOURCE files via babel, not built bundles.
 * For bundle import verification, use: yarn build && yarn verify-bundles
 */
import * as React from 'react'
import * as THREE from 'three/webgpu'
import { uniform, color, vec3, float, mix } from 'three/tsl'
import { createCanvas } from '../../../test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  act,
  useThree,
  extend,
  R3F_BUILD_LEGACY,
  R3F_BUILD_WEBGPU,
  // WebGPU-specific hooks
  useUniform,
  useUniforms,
  useNodes,
  useLocalNodes,
  useTextures,
  // Cleanup utilities
  removeUniforms,
  clearScope,
  clearRootUniforms,
  removeNodes,
  clearNodeScope,
  clearRootNodes,
} from '../../src/webgpu'

// Note: WebGPU entry auto-extends THREE with node materials
// No need to call extend() manually

//* Test Setup ==============================

let root: ReconcilerRoot<HTMLCanvasElement> = null!
const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

// Suppress WebGL deprecation warning in WebGPU tests
// (Jest resolves #three to default entry with both flags true, but built bundles are correct)
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
  console.log = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    // Skip WebGL deprecation logs (heading and empty line before it)
    if (message.includes('WebGlRenderer Usage')) return
    if (args.length === 0) return
    if (args.length === 1 && message === 'undefined') return
    originalLog.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    if (message.includes('WebGlRenderer usage is deprecated')) return
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.log = originalLog
})

function createRoot() {
  const canvas = createCanvas()
  const root = createRootImpl(canvas)
  roots.push(root)
  return root
}

beforeEach(() => (root = createRoot()))

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount())
  }
  roots.length = 0
})

//* Build Flags ==============================

describe('WebGPU Build Flags', () => {
  // NOTE: In Jest, babel resolves #three to the default (three/index.ts)
  // So both flags are true. In the BUILT bundle, webgpu/index.mjs will have:
  // R3F_BUILD_LEGACY=false, R3F_BUILD_WEBGPU=true
  // Verify with: yarn build && yarn verify-bundles

  it('should export R3F_BUILD_WEBGPU as true', () => {
    expect(R3F_BUILD_WEBGPU).toBe(true)
  })

  it('should export R3F_BUILD_LEGACY as false (no legacy in webgpu)', () => {
    // WebGPU entry uses explicit path to three/webgpu.ts which has LEGACY=false
    expect(R3F_BUILD_LEGACY).toBe(false)
  })
})

//* Hook Exports ==============================

describe('WebGPU Hook Exports', () => {
  it('should export all WebGPU hooks', () => {
    expect(typeof useUniform).toBe('function')
    expect(typeof useUniforms).toBe('function')
    expect(typeof useNodes).toBe('function')
    expect(typeof useLocalNodes).toBe('function')
    expect(typeof useTextures).toBe('function')
  })

  it('should export cleanup utilities', () => {
    expect(typeof removeUniforms).toBe('function')
    expect(typeof clearScope).toBe('function')
    expect(typeof clearRootUniforms).toBe('function')
    expect(typeof removeNodes).toBe('function')
    expect(typeof clearNodeScope).toBe('function')
    expect(typeof clearRootNodes).toBe('function')
  })
})

//* useUniform Hook ==============================

describe('useUniform', () => {
  it('should create uniform with number value', async () => {
    let uTime: any = null

    function Test() {
      uTime = useUniform('uTime', 0)
      return null
    }

    await act(async () => root.render(<Test />))

    expect(uTime).not.toBeNull()
    expect(uTime.value).toBe(0)
    expect(uTime.uuid).toBeDefined()
  })

  it('should create uniform with THREE.Color value', async () => {
    let uColor: any = null

    function Test() {
      uColor = useUniform('uColor', new THREE.Color('#ff0000'))
      return null
    }

    await act(async () => root.render(<Test />))

    expect(uColor).not.toBeNull()
    expect(uColor.value).toBeInstanceOf(THREE.Color)
    expect(uColor.value.getHexString()).toBe('ff0000')
  })

  it('should create uniform with THREE.Vector3 value', async () => {
    let uPosition: any = null

    function Test() {
      uPosition = useUniform('uPosition', new THREE.Vector3(1, 2, 3))
      return null
    }

    await act(async () => root.render(<Test />))

    expect(uPosition).not.toBeNull()
    expect(uPosition.value.x).toBe(1)
    expect(uPosition.value.y).toBe(2)
    expect(uPosition.value.z).toBe(3)
  })

  it('should throw when getting non-existent uniform', async () => {
    let error: Error | null = null

    function Test() {
      try {
        useUniform('uNonExistent')
      } catch (e) {
        error = e as Error
      }
      return null
    }

    await act(async () => root.render(<Test />))

    expect(error).not.toBeNull()
    expect(error!.message).toContain('uNonExistent')
    expect(error!.message).toContain('not found')
  })

  it('should return existing uniform when accessed by name', async () => {
    let created: any = null
    let retrieved: any = null

    function Creator() {
      created = useUniform('uShared', 42)
      return null
    }

    function Reader() {
      retrieved = useUniform('uShared')
      return null
    }

    await act(async () =>
      root.render(
        <>
          <Creator />
          <Reader />
        </>,
      ),
    )

    expect(created).toBe(retrieved)
    expect(retrieved.value).toBe(42)
  })

  it('should allow imperative .value updates', async () => {
    let uValue: any = null

    function Test() {
      uValue = useUniform('uValue', 10)
      return null
    }

    await act(async () => root.render(<Test />))
    expect(uValue.value).toBe(10)

    // Imperative update
    uValue.value = 20
    expect(uValue.value).toBe(20)
  })

  it('should store uniform in state.uniforms', async () => {
    let store: any = null

    function Test() {
      useUniform('uStored', 123)
      store = useThree()
      return null
    }

    await act(async () => root.render(<Test />))

    expect(store.uniforms.uStored).toBeDefined()
    expect(store.uniforms.uStored.value).toBe(123)
  })
})

//* useUniforms Hook ==============================

describe('useUniforms', () => {
  // Object Syntax ---------------------------------

  describe('object syntax', () => {
    it('should create multiple uniforms with plain values', async () => {
      let uniforms: any = null

      function Test() {
        uniforms = useUniforms({
          uTime: 0,
          uIntensity: 1.5,
          uEnabled: true,
        })
        return null
      }

      await act(async () => root.render(<Test />))

      expect(uniforms.uTime.value).toBe(0)
      expect(uniforms.uIntensity.value).toBe(1.5)
      expect(uniforms.uEnabled.value).toBe(true)
    })

    it('should auto-vectorize plain objects to Vector3', async () => {
      let uniforms: any = null

      function Test() {
        uniforms = useUniforms({
          uPosition: { x: 1, y: 2, z: 3 },
        })
        return null
      }

      await act(async () => root.render(<Test />))

      // Should be converted to Vector3
      expect(uniforms.uPosition.value.x).toBe(1)
      expect(uniforms.uPosition.value.y).toBe(2)
      expect(uniforms.uPosition.value.z).toBe(3)
    })

    it('should handle hex color strings', async () => {
      let uniforms: any = null

      function Test() {
        uniforms = useUniforms({
          uColor: '#00ff00',
        })
        return null
      }

      await act(async () => root.render(<Test />))

      // String colors should work
      expect(uniforms.uColor).toBeDefined()
      expect(uniforms.uColor.value).toBeDefined()
    })
  })

  // Function Syntax ---------------------------------

  describe('function syntax', () => {
    it('should receive state in creator function', async () => {
      let receivedState: any = null
      let uniforms: any = null

      function Test() {
        uniforms = useUniforms((state) => {
          receivedState = state
          return { uCameraZ: state.camera.position.z }
        })
        return null
      }

      await act(async () => root.render(<Test />))

      expect(receivedState).not.toBeNull()
      expect(receivedState.camera).toBeDefined()
      expect(receivedState.scene).toBeDefined()
      expect(uniforms.uCameraZ).toBeDefined()
    })

    it('should access existing uniforms in creator', async () => {
      let derived: any = null

      function Setup() {
        useUniforms({ uBase: 10 })
        return null
      }

      function Derived() {
        // Access existing uniform's value to create a new uniform
        derived = useUniforms((state) => {
          const baseValue = (state.uniforms.uBase as any)?.value ?? 0
          return { uDerived: baseValue }
        })
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <Derived />
          </>,
        ),
      )

      expect(derived.uDerived.value).toBe(10)
    })
  })

  // Scopes ---------------------------------

  describe('scopes', () => {
    it('should create scoped uniforms', async () => {
      let playerUniforms: any = null
      let enemyUniforms: any = null

      function Test() {
        playerUniforms = useUniforms({ uHealth: 100 }, 'player')
        enemyUniforms = useUniforms({ uHealth: 50 }, 'enemy')
        return null
      }

      await act(async () => root.render(<Test />))

      expect(playerUniforms.uHealth.value).toBe(100)
      expect(enemyUniforms.uHealth.value).toBe(50)
      // Different uniforms
      expect(playerUniforms.uHealth).not.toBe(enemyUniforms.uHealth)
    })

    it('should retrieve scope with string argument', async () => {
      let retrieved: any = null

      function Setup() {
        useUniforms({ uSpeed: 5 }, 'vehicle')
        return null
      }

      function Reader() {
        retrieved = useUniforms('vehicle')
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <Reader />
          </>,
        ),
      )

      expect(retrieved.uSpeed).toBeDefined()
      expect(retrieved.uSpeed.value).toBe(5)
    })

    it('should isolate same name in different scopes', async () => {
      let store: any = null

      function Test() {
        useUniforms({ uValue: 1 }, 'scopeA')
        useUniforms({ uValue: 2 }, 'scopeB')
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))

      // Scopes should be separate objects
      expect(store.uniforms.scopeA.uValue.value).toBe(1)
      expect(store.uniforms.scopeB.uValue.value).toBe(2)
    })

    it('should return all uniforms when called with no arguments', async () => {
      let all: any = null

      function Setup() {
        useUniforms({ uRoot: 10 })
        useUniforms({ uScoped: 20 }, 'myScope')
        return null
      }

      function Reader() {
        all = useUniforms()
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <Reader />
          </>,
        ),
      )

      expect(all.uRoot).toBeDefined()
      expect(all.myScope).toBeDefined()
      expect(all.myScope.uScoped).toBeDefined()
    })
  })

  // Reuse ---------------------------------

  describe('reuse', () => {
    it('should reuse existing uniform across components', async () => {
      let uniform1: any = null
      let uniform2: any = null

      function Component1() {
        uniform1 = useUniforms({ uShared: 10 })
        return null
      }

      function Component2() {
        uniform2 = useUniforms({ uShared: 20 })
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Component1 />
            <Component2 />
          </>,
        ),
      )

      // Same reference
      expect(uniform1.uShared).toBe(uniform2.uShared)
      // Value updated by second component
      expect(uniform1.uShared.value).toBe(20)
    })
  })
})

//* useNodes Hook ==============================

describe('useNodes', () => {
  // Creator Pattern ---------------------------------

  describe('creator pattern', () => {
    it('should receive RootState in creator', async () => {
      let receivedState: any = null

      function Test() {
        useNodes((state) => {
          receivedState = state
          return { testNode: color('#ff0000') }
        })
        return null
      }

      await act(async () => root.render(<Test />))

      expect(receivedState).not.toBeNull()
      expect(receivedState.scene).toBeDefined()
      expect(receivedState.camera).toBeDefined()
      expect(receivedState.uniforms).toBeDefined()
      expect(receivedState.nodes).toBeDefined()
    })

    it('should access uniforms in node creation', async () => {
      let nodes: any = null
      let uniformRef: any = null

      function Setup() {
        const { uIntensity } = useUniforms({ uIntensity: 0.5 })
        uniformRef = uIntensity
        return null
      }

      function NodeCreator() {
        // Use mix() to combine a color with the uniform value
        nodes = useNodes(({ uniforms }) => {
          const intensity = uniforms.uIntensity as any
          // Create a node that uses the uniform
          return {
            colorNode: mix(color('#000000'), color('#ffffff'), intensity),
          }
        })
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <NodeCreator />
          </>,
        ),
      )

      expect(nodes.colorNode).toBeDefined()
      expect(uniformRef.value).toBe(0.5)
    })

    it('should return TSL node objects', async () => {
      let nodes: any = null

      function Test() {
        nodes = useNodes(() => ({
          colorNode: color('#ff0000'),
          floatNode: float(1.0),
          vecNode: vec3(1, 2, 3),
        }))
        return null
      }

      await act(async () => root.render(<Test />))

      expect(nodes.colorNode).toBeDefined()
      expect(nodes.floatNode).toBeDefined()
      expect(nodes.vecNode).toBeDefined()
      // TSL nodes have uuid or nodeType
      expect(nodes.colorNode.uuid || nodes.colorNode.nodeType).toBeDefined()
    })
  })

  // Scopes ---------------------------------

  describe('scopes', () => {
    it('should create scoped nodes', async () => {
      let effectNodes: any = null

      function Test() {
        effectNodes = useNodes(
          () => ({
            glowColor: color('#00ffff'),
          }),
          'effects',
        )
        return null
      }

      await act(async () => root.render(<Test />))

      expect(effectNodes.glowColor).toBeDefined()
    })

    it('should retrieve scope with string argument', async () => {
      let retrieved: any = null

      function Setup() {
        useNodes(
          () => ({
            baseColor: color('#ffffff'),
          }),
          'materials',
        )
        return null
      }

      function Reader() {
        retrieved = useNodes('materials')
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <Reader />
          </>,
        ),
      )

      expect(retrieved.baseColor).toBeDefined()
    })

    it('should return all nodes when called with no arguments', async () => {
      let all: any = null

      function Setup() {
        useNodes(() => ({ rootNode: float(1) }))
        useNodes(() => ({ scopedNode: float(2) }), 'myScope')
        return null
      }

      function Reader() {
        all = useNodes()
        return null
      }

      await act(async () =>
        root.render(
          <>
            <Setup />
            <Reader />
          </>,
        ),
      )

      expect(all.rootNode).toBeDefined()
      expect(all.myScope).toBeDefined()
      expect(all.myScope.scopedNode).toBeDefined()
    })
  })

  // Storage ---------------------------------

  describe('storage', () => {
    it('should store nodes in state.nodes', async () => {
      let store: any = null

      function Test() {
        useNodes(() => ({ storedNode: color('#123456') }))
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))

      expect(store.nodes.storedNode).toBeDefined()
    })

    it('should store scoped nodes at state.nodes[scope]', async () => {
      let store: any = null

      function Test() {
        useNodes(() => ({ scopedNode: float(42) }), 'myScope')
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))

      expect(store.nodes.myScope).toBeDefined()
      expect(store.nodes.myScope.scopedNode).toBeDefined()
    })
  })
})

//* useLocalNodes Hook ==============================

describe('useLocalNodes', () => {
  it('should NOT store in global state', async () => {
    let store: any = null

    function Test() {
      useLocalNodes(() => ({
        localNode: color('#ff00ff'),
      }))
      store = useThree()
      return null
    }

    await act(async () => root.render(<Test />))

    // Should not be in global nodes
    expect(store.nodes.localNode).toBeUndefined()
  })

  it('should receive state with uniforms and nodes', async () => {
    let receivedState: any = null

    function Setup() {
      useUniforms({ uGlobal: 1 })
      useNodes(() => ({ globalNode: float(1) }))
      return null
    }

    function LocalUser() {
      useLocalNodes((state) => {
        receivedState = state
        return { local: float(0) }
      })
      return null
    }

    await act(async () =>
      root.render(
        <>
          <Setup />
          <LocalUser />
        </>,
      ),
    )

    expect(receivedState.uniforms.uGlobal).toBeDefined()
    expect(receivedState.nodes.globalNode).toBeDefined()
  })

  it('should mix shared uniforms with local values', async () => {
    let localResult: any = null

    function Setup() {
      useUniforms({ uBase: 10 })
      return null
    }

    function LocalUser() {
      localResult = useLocalNodes(({ uniforms }) => ({
        baseRef: uniforms.uBase,
        localValue: float(5),
      }))
      return null
    }

    await act(async () =>
      root.render(
        <>
          <Setup />
          <LocalUser />
        </>,
      ),
    )

    expect(localResult.baseRef.value).toBe(10)
    expect(localResult.localValue).toBeDefined()
  })
})

//* Material Integration (Smoke Tests) ==============================

describe('Material Integration', () => {
  // WebGPU entry auto-extends THREE with node materials
  // These tests verify nodes work with meshBasicNodeMaterial
  // NOTE: frameloop='never' prevents actual rendering (WebGL can't render NodeMaterials)

  it('should render mesh with meshBasicNodeMaterial and colorNode', async () => {
    function TestMesh() {
      const { colorNode } = useNodes(() => ({
        colorNode: color('#ff0000'),
      }))

      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicNodeMaterial colorNode={colorNode} />
        </mesh>
      )
    }

    // Configure with frameloop='never' to prevent WebGL from trying to render NodeMaterial
    const store = await act(async () => (await root.configure({ frameloop: 'never' })).render(<TestMesh />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Mesh)
    // Verify material is a NodeMaterial
    const mesh = scene.children[1] as THREE.Mesh
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
  })

  it('should render with uniform as colorNode', async () => {
    function TestMesh() {
      const { uColor } = useUniforms({
        uColor: '#00ff00',
      })

      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicNodeMaterial colorNode={uColor} />
        </mesh>
      )
    }

    const store = await act(async () => (await root.configure({ frameloop: 'never' })).render(<TestMesh />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    const mesh = scene.children[1] as THREE.Mesh
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
  })

  it('should render multiple meshes with shared node colorNode', async () => {
    function Setup() {
      useNodes(() => ({
        sharedColor: color('#0000ff'),
      }))
      return null
    }

    function Mesh1() {
      const { sharedColor } = useNodes()
      return (
        <mesh position={[-1, 0, 0]}>
          <boxGeometry />
          <meshBasicNodeMaterial colorNode={sharedColor} />
        </mesh>
      )
    }

    function Mesh2() {
      const { sharedColor } = useNodes()
      return (
        <mesh position={[1, 0, 0]}>
          <boxGeometry />
          <meshBasicNodeMaterial colorNode={sharedColor} />
        </mesh>
      )
    }

    const store = await act(async () =>
      (await root.configure({ frameloop: 'never' })).render(
        <>
          <Setup />
          <Mesh1 />
          <Mesh2 />
        </>,
      ),
    )
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(3)
    // Both should use MeshBasicNodeMaterial
    expect((scene.children[1] as THREE.Mesh).material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
    expect((scene.children[2] as THREE.Mesh).material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
  })
})

//* Cleanup Utilities ==============================

describe('Cleanup Utilities', () => {
  describe('removeUniforms', () => {
    it('should remove root-level uniforms', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useUniforms({ uToRemove: 1, uToKeep: 2 })
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uToRemove).toBeDefined()

      await act(async () => {
        removeUniforms(setState, ['uToRemove'])
      })

      // Re-read state
      const newStore = store
      expect(newStore.uniforms.uToRemove).toBeUndefined()
      expect(newStore.uniforms.uToKeep).toBeDefined()
    })

    it('should remove scoped uniforms', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useUniforms({ uScoped: 1 }, 'myScope')
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.myScope.uScoped).toBeDefined()

      await act(async () => {
        removeUniforms(setState, ['uScoped'], 'myScope')
      })

      expect(store.uniforms.myScope.uScoped).toBeUndefined()
    })
  })

  describe('clearScope', () => {
    it('should clear entire scope', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useUniforms({ uA: 1, uB: 2 }, 'toClear')
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.toClear).toBeDefined()

      await act(async () => {
        clearScope(setState, 'toClear')
      })

      expect(store.uniforms.toClear).toBeUndefined()
    })
  })

  describe('clearRootUniforms', () => {
    it('should clear root uniforms but preserve scopes', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useUniforms({ uRoot: 1 })
        useUniforms({ uScoped: 2 }, 'preserved')
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uRoot).toBeDefined()
      expect(store.uniforms.preserved).toBeDefined()

      await act(async () => {
        clearRootUniforms(setState)
      })

      expect(store.uniforms.uRoot).toBeUndefined()
      expect(store.uniforms.preserved).toBeDefined()
    })
  })

  describe('removeNodes', () => {
    it('should remove root-level nodes', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useNodes(() => ({ nodeToRemove: float(1), nodeToKeep: float(2) }))
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.nodeToRemove).toBeDefined()

      await act(async () => {
        removeNodes(setState, ['nodeToRemove'])
      })

      expect(store.nodes.nodeToRemove).toBeUndefined()
      expect(store.nodes.nodeToKeep).toBeDefined()
    })
  })

  describe('clearNodeScope', () => {
    it('should clear entire node scope', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useNodes(() => ({ nodeA: float(1) }), 'scopeToClear')
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.scopeToClear).toBeDefined()

      await act(async () => {
        clearNodeScope(setState, 'scopeToClear')
      })

      expect(store.nodes.scopeToClear).toBeUndefined()
    })
  })

  describe('clearRootNodes', () => {
    it('should clear root nodes but preserve scopes', async () => {
      let store: any = null
      let setState: any = null

      function Test() {
        useNodes(() => ({ rootNode: float(1) }))
        useNodes(() => ({ scopedNode: float(2) }), 'preserved')
        const s = useThree()
        store = s
        setState = s.set
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.rootNode).toBeDefined()
      expect(store.nodes.preserved).toBeDefined()

      await act(async () => {
        clearRootNodes(setState)
      })

      expect(store.nodes.rootNode).toBeUndefined()
      expect(store.nodes.preserved).toBeDefined()
    })
  })
})

//* Hook Utils (New API) ==============================

describe('useNodes Utils', () => {
  describe('removeNodes (returned util)', () => {
    it('should remove single node from root', async () => {
      let store: any = null
      let removeNodesFn: any = null

      function Test() {
        const { removeNodes } = useNodes(() => ({ nodeToRemove: float(1), nodeToKeep: float(2) }))
        removeNodesFn = removeNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.nodeToRemove).toBeDefined()
      expect(store.nodes.nodeToKeep).toBeDefined()

      await act(async () => {
        removeNodesFn('nodeToRemove')
      })

      expect(store.nodes.nodeToRemove).toBeUndefined()
      expect(store.nodes.nodeToKeep).toBeDefined()
    })

    it('should remove multiple nodes as array', async () => {
      let store: any = null
      let removeNodesFn: any = null

      function Test() {
        const { removeNodes } = useNodes(() => ({ nodeA: float(1), nodeB: float(2), nodeC: float(3) }))
        removeNodesFn = removeNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.nodeA).toBeDefined()
      expect(store.nodes.nodeB).toBeDefined()
      expect(store.nodes.nodeC).toBeDefined()

      await act(async () => {
        removeNodesFn(['nodeA', 'nodeB'])
      })

      expect(store.nodes.nodeA).toBeUndefined()
      expect(store.nodes.nodeB).toBeUndefined()
      expect(store.nodes.nodeC).toBeDefined()
    })

    it('should remove nodes from scope', async () => {
      let store: any = null
      let removeNodesFn: any = null

      function Test() {
        const { removeNodes } = useNodes(() => ({ scopedNode: float(1), anotherNode: float(2) }), 'myScope')
        removeNodesFn = removeNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.myScope.scopedNode).toBeDefined()
      expect(store.nodes.myScope.anotherNode).toBeDefined()

      await act(async () => {
        removeNodesFn('scopedNode', 'myScope')
      })

      expect(store.nodes.myScope.scopedNode).toBeUndefined()
      expect(store.nodes.myScope.anotherNode).toBeDefined()
    })
  })

  describe('clearNodes (returned util)', () => {
    it('should clear specific scope', async () => {
      let store: any = null
      let clearNodesFn: any = null

      function Test() {
        useNodes(() => ({ rootNode: float(1) }))
        const { clearNodes } = useNodes(() => ({ scopedNode: float(2) }), 'toClear')
        clearNodesFn = clearNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.rootNode).toBeDefined()
      expect(store.nodes.toClear).toBeDefined()

      await act(async () => {
        clearNodesFn('toClear')
      })

      expect(store.nodes.rootNode).toBeDefined()
      expect(store.nodes.toClear).toBeUndefined()
    })

    it('should clear root only with "root" argument', async () => {
      let store: any = null
      let clearNodesFn: any = null

      function Test() {
        const { clearNodes } = useNodes(() => ({ rootNode: float(1) }))
        useNodes(() => ({ scopedNode: float(2) }), 'preserved')
        clearNodesFn = clearNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.rootNode).toBeDefined()
      expect(store.nodes.preserved).toBeDefined()

      await act(async () => {
        clearNodesFn('root')
      })

      expect(store.nodes.rootNode).toBeUndefined()
      expect(store.nodes.preserved).toBeDefined()
    })

    it('should clear everything when called with no args', async () => {
      let store: any = null
      let clearNodesFn: any = null

      function Test() {
        const { clearNodes } = useNodes(() => ({ rootNode: float(1) }))
        useNodes(() => ({ scopedNode: float(2) }), 'scopeA')
        useNodes(() => ({ anotherNode: float(3) }), 'scopeB')
        clearNodesFn = clearNodes
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.nodes.rootNode).toBeDefined()
      expect(store.nodes.scopeA).toBeDefined()
      expect(store.nodes.scopeB).toBeDefined()

      await act(async () => {
        clearNodesFn()
      })

      expect(store.nodes.rootNode).toBeUndefined()
      expect(store.nodes.scopeA).toBeUndefined()
      expect(store.nodes.scopeB).toBeUndefined()
    })
  })
})

describe('useUniforms Utils', () => {
  describe('removeUniforms (returned util)', () => {
    it('should remove single uniform from root', async () => {
      let store: any = null
      let removeUniformsFn: any = null

      function Test() {
        const { removeUniforms } = useUniforms({ uToRemove: 1, uToKeep: 2 })
        removeUniformsFn = removeUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uToRemove).toBeDefined()
      expect(store.uniforms.uToKeep).toBeDefined()

      await act(async () => {
        removeUniformsFn('uToRemove')
      })

      expect(store.uniforms.uToRemove).toBeUndefined()
      expect(store.uniforms.uToKeep).toBeDefined()
    })

    it('should remove multiple uniforms as array', async () => {
      let store: any = null
      let removeUniformsFn: any = null

      function Test() {
        const { removeUniforms } = useUniforms({ uA: 1, uB: 2, uC: 3 })
        removeUniformsFn = removeUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uA).toBeDefined()
      expect(store.uniforms.uB).toBeDefined()
      expect(store.uniforms.uC).toBeDefined()

      await act(async () => {
        removeUniformsFn(['uA', 'uB'])
      })

      expect(store.uniforms.uA).toBeUndefined()
      expect(store.uniforms.uB).toBeUndefined()
      expect(store.uniforms.uC).toBeDefined()
    })

    it('should remove uniforms from scope', async () => {
      let store: any = null
      let removeUniformsFn: any = null

      function Test() {
        const { removeUniforms } = useUniforms({ uScoped: 1, uAnother: 2 }, 'myScope')
        removeUniformsFn = removeUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.myScope.uScoped).toBeDefined()
      expect(store.uniforms.myScope.uAnother).toBeDefined()

      await act(async () => {
        removeUniformsFn('uScoped', 'myScope')
      })

      expect(store.uniforms.myScope.uScoped).toBeUndefined()
      expect(store.uniforms.myScope.uAnother).toBeDefined()
    })
  })

  describe('clearUniforms (returned util)', () => {
    it('should clear specific scope', async () => {
      let store: any = null
      let clearUniformsFn: any = null

      function Test() {
        useUniforms({ uRoot: 1 })
        const { clearUniforms } = useUniforms({ uScoped: 2 }, 'toClear')
        clearUniformsFn = clearUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uRoot).toBeDefined()
      expect(store.uniforms.toClear).toBeDefined()

      await act(async () => {
        clearUniformsFn('toClear')
      })

      expect(store.uniforms.uRoot).toBeDefined()
      expect(store.uniforms.toClear).toBeUndefined()
    })

    it('should clear root only with "root" argument', async () => {
      let store: any = null
      let clearUniformsFn: any = null

      function Test() {
        const { clearUniforms } = useUniforms({ uRoot: 1 })
        useUniforms({ uScoped: 2 }, 'preserved')
        clearUniformsFn = clearUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uRoot).toBeDefined()
      expect(store.uniforms.preserved).toBeDefined()

      await act(async () => {
        clearUniformsFn('root')
      })

      expect(store.uniforms.uRoot).toBeUndefined()
      expect(store.uniforms.preserved).toBeDefined()
    })

    it('should clear everything when called with no args', async () => {
      let store: any = null
      let clearUniformsFn: any = null

      function Test() {
        const { clearUniforms } = useUniforms({ uRoot: 1 })
        useUniforms({ uScoped: 2 }, 'scopeA')
        useUniforms({ uAnother: 3 }, 'scopeB')
        clearUniformsFn = clearUniforms
        store = useThree()
        return null
      }

      await act(async () => root.render(<Test />))
      expect(store.uniforms.uRoot).toBeDefined()
      expect(store.uniforms.scopeA).toBeDefined()
      expect(store.uniforms.scopeB).toBeDefined()

      await act(async () => {
        clearUniformsFn()
      })

      expect(store.uniforms.uRoot).toBeUndefined()
      expect(store.uniforms.scopeA).toBeUndefined()
      expect(store.uniforms.scopeB).toBeUndefined()
    })
  })
})

//* Core R3F Features ==============================

describe('Core R3F Features', () => {
  it('should have uniforms and nodes in store', async () => {
    let state: any = null

    function Test() {
      state = useThree()
      return null
    }

    await act(async () => root.render(<Test />))

    expect(state.uniforms).toBeDefined()
    expect(state.nodes).toBeDefined()
    expect(typeof state.uniforms).toBe('object')
    expect(typeof state.nodes).toBe('object')
  })

  it('should render three.js elements', async () => {
    const store = await act(async () => root.render(<mesh />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Mesh)
  })
})
