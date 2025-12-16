# WebGPU Testing Guide

This guide covers testing React Three Fiber applications that use WebGPU and TSL (Three Shading Language).

## Table of Contents

- [Setup](#setup)
- [Testing Uniforms](#testing-uniforms)
- [Testing Nodes](#testing-nodes)
- [Testing Materials](#testing-materials)
- [Cleanup Utilities](#cleanup-utilities)
- [Best Practices](#best-practices)

---

## Setup <a id="setup"></a>

### Installation

```bash
yarn add @react-three/fiber three
yarn add -D @react-three/test-renderer
```

### Import Structure

When testing WebGPU applications, use the `/webgpu` entry point:

```tsx
// Match your test renderer entry to your fiber entry
import ReactThreeTestRenderer, {
  useUniform,
  useUniforms,
  useNodes,
  useLocalNodes,
} from '@react-three/test-renderer/webgpu'

import { useThree } from '@react-three/fiber/webgpu'
```

### Basic Test Structure

```tsx
describe('My WebGPU Component', () => {
  it('should render correctly', async () => {
    const renderer = await ReactThreeTestRenderer.create(<MyComponent />)

    // Your assertions
    expect(renderer.scene.children.length).toBe(1)

    // Always unmount to clean up
    await renderer.unmount()
  })
})
```

---

## Testing Uniforms <a id="testing-uniforms"></a>

### useUniform Hook

Test single uniforms created with `useUniform`:

```tsx
import ReactThreeTestRenderer, { useUniform } from '@react-three/test-renderer/webgpu'

describe('useUniform', () => {
  it('should create uniform with initial value', async () => {
    let uTime: any = null

    function TestComponent() {
      uTime = useUniform('uTime', 0)
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    // Assert initial value
    expect(uTime.value).toBe(0)

    // Test imperative updates
    uTime.value = 1.5
    expect(uTime.value).toBe(1.5)

    await renderer.unmount()
  })

  it('should work with THREE types', async () => {
    let uColor: any = null

    function TestComponent() {
      uColor = useUniform('uColor', new THREE.Color('#ff0000'))
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(uColor.value).toBeInstanceOf(THREE.Color)
    expect(uColor.value.getHexString()).toBe('ff0000')

    await renderer.unmount()
  })
})
```

### useUniforms Hook

Test multiple uniforms and scoped uniforms:

```tsx
import ReactThreeTestRenderer, { useUniforms } from '@react-three/test-renderer/webgpu'

describe('useUniforms', () => {
  it('should create multiple uniforms', async () => {
    let uniforms: any = null

    function TestComponent() {
      uniforms = useUniforms({
        uTime: 0,
        uIntensity: 1.5,
        uEnabled: true,
      })
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(uniforms.uTime.value).toBe(0)
    expect(uniforms.uIntensity.value).toBe(1.5)
    expect(uniforms.uEnabled.value).toBe(true)

    await renderer.unmount()
  })

  it('should support scoped uniforms', async () => {
    let playerUniforms: any = null
    let enemyUniforms: any = null

    function TestComponent() {
      playerUniforms = useUniforms({ uHealth: 100 }, 'player')
      enemyUniforms = useUniforms({ uHealth: 50 }, 'enemy')
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    // Different scopes have independent uniforms
    expect(playerUniforms.uHealth.value).toBe(100)
    expect(enemyUniforms.uHealth.value).toBe(50)
    expect(playerUniforms.uHealth).not.toBe(enemyUniforms.uHealth)

    await renderer.unmount()
  })

  it('should share uniforms across components', async () => {
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

    const renderer = await ReactThreeTestRenderer.create(
      <>
        <Component1 />
        <Component2 />
      </>,
    )

    // Same reference (uniform reuse)
    expect(uniform1.uShared).toBe(uniform2.uShared)
    // Value from second component (last write wins)
    expect(uniform1.uShared.value).toBe(20)

    await renderer.unmount()
  })
})
```

---

## Testing Nodes <a id="testing-nodes"></a>

### useNodes Hook

Test TSL node creation and state storage:

```tsx
import ReactThreeTestRenderer, { useNodes } from '@react-three/test-renderer/webgpu'
import { color, float, vec3, mix } from 'three/tsl'
import { useThree } from '@react-three/fiber/webgpu'

describe('useNodes', () => {
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

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(nodes.colorNode).toBeDefined()
    expect(nodes.floatNode).toBeDefined()
    expect(nodes.vecNode).toBeDefined()

    await renderer.unmount()
  })

  it('should access uniforms in node creation', async () => {
    let nodes: any = null

    function TestComponent() {
      useUniforms({ uIntensity: 0.5 })

      nodes = useNodes(({ uniforms }) => ({
        gradientColor: mix(color('#000000'), color('#ffffff'), uniforms.uIntensity as any),
      }))
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(nodes.gradientColor).toBeDefined()

    await renderer.unmount()
  })

  it('should store nodes in state', async () => {
    let store: any = null

    function TestComponent() {
      useNodes(() => ({ myNode: float(42) }))
      store = useThree()
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(store.nodes.myNode).toBeDefined()

    await renderer.unmount()
  })
})
```

### useLocalNodes Hook

Test local nodes that don't pollute global state:

```tsx
import ReactThreeTestRenderer, { useLocalNodes } from '@react-three/test-renderer/webgpu'
import { useThree } from '@react-three/fiber/webgpu'

describe('useLocalNodes', () => {
  it('should NOT store in global state', async () => {
    let store: any = null
    let localNodes: any = null

    function TestComponent() {
      localNodes = useLocalNodes(() => ({
        localColor: color('#ff00ff'),
      }))
      store = useThree()
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    // Local nodes available to component
    expect(localNodes.localColor).toBeDefined()

    // But NOT in global state
    expect(store.nodes.localColor).toBeUndefined()

    await renderer.unmount()
  })
})
```

---

## Testing Materials <a id="testing-materials"></a>

### Node Materials

Test that node materials render correctly:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer/webgpu'
import * as THREE from 'three/webgpu'

describe('Node Materials', () => {
  it('should render meshBasicNodeMaterial', async () => {
    function TestMesh() {
      return (
        <mesh>
          <boxGeometry />
          <meshBasicNodeMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<TestMesh />)

    const mesh = renderer.scene.children[0].instance as THREE.Mesh
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)

    await renderer.unmount()
  })

  it('should apply colorNode from nodes', async () => {
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

    const renderer = await ReactThreeTestRenderer.create(<TestMesh />)

    const mesh = renderer.scene.children[0].instance as THREE.Mesh
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicNodeMaterial)
    // Material should have the colorNode property set
    expect((mesh.material as any).colorNode).toBeDefined()

    await renderer.unmount()
  })

  it('should apply uniform as colorNode', async () => {
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

    const renderer = await ReactThreeTestRenderer.create(<TestMesh />)

    expect(renderer.scene.children[0].type).toBe('Mesh')

    await renderer.unmount()
  })
})
```

---

## Cleanup Utilities <a id="cleanup-utilities"></a>

The WebGPU entry exports utilities for cleaning up uniforms and nodes:

```tsx
import ReactThreeTestRenderer, {
  useUniforms,
  useNodes,
  removeUniforms,
  clearScope,
  clearRootUniforms,
  removeNodes,
  clearNodeScope,
  clearRootNodes,
} from '@react-three/test-renderer/webgpu'
import { useThree } from '@react-three/fiber/webgpu'

describe('Cleanup Utilities', () => {
  it('should remove specific uniforms', async () => {
    let store: any = null
    let setState: any = null

    function TestComponent() {
      useUniforms({ uToRemove: 1, uToKeep: 2 })
      const s = useThree()
      store = s
      setState = s.set
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    // Both uniforms exist
    expect(store.uniforms.uToRemove).toBeDefined()
    expect(store.uniforms.uToKeep).toBeDefined()

    // Remove one
    await ReactThreeTestRenderer.act(async () => {
      removeUniforms(setState, ['uToRemove'])
    })

    // Verify removal
    expect(store.uniforms.uToRemove).toBeUndefined()
    expect(store.uniforms.uToKeep).toBeDefined()

    await renderer.unmount()
  })

  it('should clear an entire scope', async () => {
    let store: any = null
    let setState: any = null

    function TestComponent() {
      useUniforms({ uA: 1, uB: 2 }, 'myScope')
      const s = useThree()
      store = s
      setState = s.set
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    expect(store.uniforms.myScope).toBeDefined()

    await ReactThreeTestRenderer.act(async () => {
      clearScope(setState, 'myScope')
    })

    expect(store.uniforms.myScope).toBeUndefined()

    await renderer.unmount()
  })

  it('should clear all root uniforms', async () => {
    let store: any = null
    let setState: any = null

    function TestComponent() {
      useUniforms({ uRoot: 1 })
      useUniforms({ uScoped: 2 }, 'preserved')
      const s = useThree()
      store = s
      setState = s.set
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    await ReactThreeTestRenderer.act(async () => {
      clearRootUniforms(setState)
    })

    // Root uniforms cleared
    expect(store.uniforms.uRoot).toBeUndefined()
    // Scoped uniforms preserved
    expect(store.uniforms.preserved).toBeDefined()

    await renderer.unmount()
  })
})
```

---

## Best Practices <a id="best-practices"></a>

### 1. Always Unmount

Always call `renderer.unmount()` to clean up resources:

```tsx
it('should test something', async () => {
  const renderer = await ReactThreeTestRenderer.create(<Component />)

  // ... assertions ...

  await renderer.unmount() // Always cleanup
})
```

### 2. Use afterEach for Cleanup

For test suites, use `afterEach` to ensure cleanup:

```tsx
let renderer: any = null

afterEach(async () => {
  if (renderer) {
    await renderer.unmount()
    renderer = null
  }
})

it('should test something', async () => {
  renderer = await ReactThreeTestRenderer.create(<Component />)
  // ... assertions ...
})
```

### 3. Test Component Isolation

Create small test components that isolate what you're testing:

```tsx
// Good: Isolated test component
function TestUniformAccess() {
  const uniforms = useUniforms({ uValue: 42 })
  capturedUniforms = uniforms
  return null
}

// Bad: Testing through complex component tree
function TestComplexScene() {
  // Many unrelated things happening
  return <FullApplicationScene />
}
```

### 4. Match Entry Points

Always use matching entry points:

```tsx
// Your app uses:
import { Canvas, useUniforms } from '@react-three/fiber/webgpu'

// Your tests should use:
import ReactThreeTestRenderer from '@react-three/test-renderer/webgpu'
```

### 5. Test State Changes

Use `act()` to wrap state changes:

```tsx
await ReactThreeTestRenderer.act(async () => {
  uniforms.uTime.value = newValue
  // or
  removeUniforms(setState, ['uOldUniform'])
})
```

---

## Troubleshooting

### Import Errors

If you get import errors for TSL functions:

```tsx
// Make sure you import from three/tsl
import { color, float, vec3 } from 'three/tsl'
// NOT from three or three/webgpu
```

### WebGPU Context Errors

The test renderer automatically mocks WebGPU. If you need manual control:

```tsx
import { mockWebGPU, unmockWebGPU } from '@react-three/test-renderer/webgpu'

beforeAll(() => {
  mockWebGPU()
})

afterAll(() => {
  unmockWebGPU()
})
```

### Type Errors

Make sure your `tsconfig.json` includes the necessary types:

```json
{
  "compilerOptions": {
    "types": ["@webgpu/types"]
  }
}
```
