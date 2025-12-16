/**
 * @fileoverview Legacy Test Renderer Tests
 *
 * Tests for the legacy (WebGL-only) entry point of @react-three/test-renderer.
 * Verifies that the legacy entry works correctly for WebGL-only applications.
 */

import * as React from 'react'
import * as THREE from 'three'

import ReactThreeTestRenderer, { create, act, waitFor } from '../legacy'

//* Export Verification ==============================

describe('ReactThreeTestRenderer Legacy Entry', () => {
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

    it('should NOT export WebGPU hooks', () => {
      // Legacy entry should not have WebGPU-specific exports
      expect((ReactThreeTestRenderer as any).useUniform).toBeUndefined()
      expect((ReactThreeTestRenderer as any).useUniforms).toBeUndefined()
      expect((ReactThreeTestRenderer as any).useNodes).toBeUndefined()
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
      expect(renderer.scene.children[0].children.length).toBe(2)
      await renderer.unmount()
    })

    it('should render with different materials', async () => {
      const renderer = await create(
        <group>
          <mesh>
            <boxGeometry />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh>
            <sphereGeometry />
            <meshStandardMaterial color="blue" />
          </mesh>
          <mesh>
            <planeGeometry />
            <meshPhongMaterial color="green" />
          </mesh>
        </group>,
      )

      const group = renderer.scene.children[0]
      expect(group.children.length).toBe(3)

      const mesh1 = group.children[0].instance as THREE.Mesh
      const mesh2 = group.children[1].instance as THREE.Mesh
      const mesh3 = group.children[2].instance as THREE.Mesh

      expect(mesh1.material).toBeInstanceOf(THREE.MeshBasicMaterial)
      expect(mesh2.material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect(mesh3.material).toBeInstanceOf(THREE.MeshPhongMaterial)

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

    it('should find elements by type', async () => {
      const renderer = await create(
        <group>
          <mesh name="mesh1">
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
          <mesh name="mesh2">
            <sphereGeometry />
            <meshBasicMaterial />
          </mesh>
        </group>,
      )

      const meshes = renderer.scene.findAllByType('Mesh')
      expect(meshes.length).toBe(2)
      await renderer.unmount()
    })
  })

  //* Update and Lifecycle ==============================

  describe('update and lifecycle', () => {
    it('should update rendered content', async () => {
      const renderer = await create(
        <mesh position={[0, 0, 0]}>
          <boxGeometry />
          <meshBasicMaterial />
        </mesh>,
      )

      const initialMesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(initialMesh.position.x).toBe(0)

      await renderer.update(
        <mesh position={[5, 0, 0]}>
          <boxGeometry />
          <meshBasicMaterial />
        </mesh>,
      )

      const updatedMesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(updatedMesh.position.x).toBe(5)

      await renderer.unmount()
    })

    it('should handle unmount correctly', async () => {
      const renderer = await create(<mesh />)

      expect(renderer.scene).toBeDefined()

      await renderer.unmount()

      // getInstance should return null after unmount
      expect(renderer.getInstance()).toBeNull()
    })
  })

  //* act() Function ==============================

  describe('act function', () => {
    it('should wrap state updates', async () => {
      let setCount: React.Dispatch<React.SetStateAction<number>> | null = null

      function Counter() {
        const [count, _setCount] = React.useState(0)
        setCount = _setCount

        return (
          <mesh position={[count, 0, 0]}>
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
        )
      }

      const renderer = await create(<Counter />)

      const initialMesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(initialMesh.position.x).toBe(0)

      await act(async () => {
        setCount!(5)
      })

      const updatedMesh = renderer.scene.children[0].instance as THREE.Mesh
      expect(updatedMesh.position.x).toBe(5)

      await renderer.unmount()
    })
  })
})
