/**
 * @fileoverview WebGPU Test Renderer Tests
 *
 * Tests for the WebGPU entry point of @react-three/test-renderer.
 * Verifies that WebGPU mocking works and hooks are properly re-exported.
 */

import * as React from 'react'
import * as THREE from 'three/webgpu'
import { color, vec3, float, mix } from 'three/tsl'

import ReactThreeTestRenderer, {
  create,
  act,
  waitFor,
  // Mock utilities
  mockWebGPU,
  unmockWebGPU,
} from '../webgpu'
import * as webgpuEntry from '../webgpu'

import { useThree } from '@react-three/fiber/webgpu'
// The TSL hooks live in their own package; test-renderer no longer re-exports them.
import { useUniform, useUniforms, useNodes, useLocalNodes } from '@react-three/tsl'

//* Test Setup ==============================

describe('ReactThreeTestRenderer WebGPU Entry', () => {
  //* Export Verification ==============================

  describe('exports', () => {
    it('should export create function', () => {
      expect(typeof create).toBe('function')
    })

    it('should export act function', () => {
      expect(typeof act).toBe('function')
    })

    it('should export waitFor function', () => {
      expect(typeof waitFor).toBe('function')
    })

    it('should export default object with create, act, waitFor', () => {
      expect(typeof ReactThreeTestRenderer.create).toBe('function')
      expect(typeof ReactThreeTestRenderer.act).toBe('function')
      expect(typeof ReactThreeTestRenderer.waitFor).toBe('function')
    })

    it('no longer re-exports the TSL hooks (they live in @react-three/tsl)', () => {
      const entry = webgpuEntry as Record<string, unknown>
      for (const name of ['useUniform', 'useUniforms', 'useNodes', 'useLocalNodes']) {
        expect(entry[name]).toBeUndefined()
      }
    })

    it('should export mock utilities', () => {
      expect(typeof mockWebGPU).toBe('function')
      expect(typeof unmockWebGPU).toBe('function')
    })
  })

  //* Basic Rendering ==============================

  describe('basic rendering', () => {
    it('should render a simple mesh', async () => {
      const renderer = await create(
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </mesh>,
      )

      expect(renderer.scene.children[0].type).toBe('Mesh')
      await renderer.unmount()
    })

    it('should render a group with children', async () => {
      const renderer = await create(
        <group>
          <mesh>
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
          <mesh>
            <sphereGeometry />
            <meshBasicMaterial />
          </mesh>
        </group>,
      )

      expect(renderer.scene.children[0].type).toBe('Group')
      expect(renderer.scene.children[0].children).toHaveLength(2)
      await renderer.unmount()
    })

    it('should render meshBasicNodeMaterial', async () => {
      function TestMesh() {
        return (
          <mesh>
            <boxGeometry />
            <meshBasicNodeMaterial />
          </mesh>
        )
      }

      const renderer = await create(<TestMesh />)

      expect(renderer.scene.children[0].type).toBe('Mesh')
      const mesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
      await renderer.unmount()
    })
  })

  //* WebGPU Hooks Testing ==============================

  describe('useUniform hook', () => {
    it('should create and retrieve uniform', async () => {
      let uniformRef: any = null

      function TestComponent() {
        uniformRef = useUniform('testUniform', 42)
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(uniformRef).not.toBeNull()
      expect(uniformRef.value).toBe(42)
      await renderer.unmount()
    })

    it('should create uniform with THREE.Color', async () => {
      let uniformRef: any = null

      function TestComponent() {
        uniformRef = useUniform('colorUniform', new THREE.Color('#ff0000'))
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(uniformRef).not.toBeNull()
      expect(uniformRef.value).toBeInstanceOf(THREE.Color)
      expect(uniformRef.value.getHexString()).toBe('ff0000')
      await renderer.unmount()
    })
  })

  describe('useUniforms hook', () => {
    it('should create multiple uniforms', async () => {
      let uniforms: any = null

      function TestComponent() {
        uniforms = useUniforms({
          uTime: 0,
          uIntensity: 1.5,
          uColor: '#00ff00',
        })
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(uniforms.uTime.value).toBe(0)
      expect(uniforms.uIntensity.value).toBe(1.5)
      expect(uniforms.uColor).toBeDefined()
      await renderer.unmount()
    })

    it('should create scoped uniforms', async () => {
      let scopeA: any = null
      let scopeB: any = null

      function TestComponent() {
        scopeA = useUniforms({ uValue: 10 }, 'scopeA')
        scopeB = useUniforms({ uValue: 20 }, 'scopeB')
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(scopeA.uValue.value).toBe(10)
      expect(scopeB.uValue.value).toBe(20)
      expect(scopeA.uValue).not.toBe(scopeB.uValue)
      await renderer.unmount()
    })
  })

  describe('useNodes hook', () => {
    it('should create TSL nodes', async () => {
      let nodes: any = null

      function TestComponent() {
        nodes = useNodes(() => ({
          colorNode: color('#ff0000'),
          floatNode: float(1.0),
          vecNode: vec3(1, 2, 3),
        }))
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(nodes.colorNode).toBeDefined()
      expect(nodes.floatNode).toBeDefined()
      expect(nodes.vecNode).toBeDefined()
      await renderer.unmount()
    })

    it('should access uniforms in node creation', async () => {
      let nodes: any = null

      function TestComponent() {
        useUniforms({ uIntensity: 0.5 })

        nodes = useNodes((state) => {
          const intensity = state.uniforms.uIntensity as any
          return {
            mixedColor: mix(color('#000000'), color('#ffffff'), intensity),
          }
        })
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(nodes.mixedColor).toBeDefined()
      await renderer.unmount()
    })
  })

  describe('useLocalNodes hook', () => {
    it('should NOT store in global state', async () => {
      let store: any = null

      function TestComponent() {
        useLocalNodes(() => ({
          localNode: color('#ff00ff'),
        }))
        store = useThree()
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(store.nodes.localNode).toBeUndefined()
      await renderer.unmount()
    })

    it('should return local nodes', async () => {
      let localNodes: any = null

      function TestComponent() {
        localNodes = useLocalNodes(() => ({
          myLocalNode: float(123),
        }))
        return null
      }

      const renderer = await create(<TestComponent />)

      expect(localNodes.myLocalNode).toBeDefined()
      await renderer.unmount()
    })
  })

  //* Material Integration ==============================

  describe('material integration', () => {
    it('should render mesh with colorNode from nodes', async () => {
      function TestMesh() {
        const { colorNode } = useNodes(() => ({
          colorNode: color('#0000ff'),
        }))

        return (
          <mesh>
            <boxGeometry />
            <meshBasicNodeMaterial colorNode={colorNode} />
          </mesh>
        )
      }

      const renderer = await create(<TestMesh />)

      expect(renderer.scene.children[0].type).toBe('Mesh')
      const mesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
      await renderer.unmount()
    })

    it('should render with uniform as colorNode', async () => {
      function TestMesh() {
        const { uColor } = useUniforms({
          uColor: '#00ff00',
        })

        return (
          <mesh>
            <boxGeometry />
            <meshBasicNodeMaterial colorNode={uColor} />
          </mesh>
        )
      }

      const renderer = await create(<TestMesh />)

      expect(renderer.scene.children[0].type).toBe('Mesh')
      await renderer.unmount()
    })
  })

  //* Scene Graph Methods ==============================

  describe('scene graph methods', () => {
    it('should generate toTree snapshot', async () => {
      const renderer = await create(
        <group>
          <mesh>
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
        </group>,
      )

      const tree = renderer.toTree()
      expect(tree).toBeDefined()
      expect(Array.isArray(tree)).toBe(true)
      await renderer.unmount()
    })

    it('should generate toGraph snapshot', async () => {
      const renderer = await create(
        <group name="TestGroup">
          <mesh name="TestMesh">
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
        </group>,
      )

      const graph = renderer.toGraph()
      expect(graph).toBeDefined()
      expect(Array.isArray(graph)).toBe(true)
      await renderer.unmount()
    })
  })
})
