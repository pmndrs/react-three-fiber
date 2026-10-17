# React Three Test Renderer ⚛️🔼🧪

[![Version](https://img.shields.io/npm/v/@react-three/test-renderer?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/test-renderer)
[![Downloads](https://img.shields.io/npm/dt/@react-three/test-renderer.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/test-renderer)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)

`@react-three/test-renderer` is a React testing <a href="https://reactjs.org/docs/codebase-overview.html#renderers">renderer</a> for threejs in node.

```bash
yarn add @react-three/fiber three
yarn add -D @react-three/test-renderer
```

---

## The problem

You've written a complex and amazing webgl experience using [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) and you want to test it to make sure it works even after you add even more features.

You go to use `react-dom` but hang on, `THREE` elements aren't in the DOM! You decide to use `@react-three/test-renderer` you can see the container & the canvas but you can't see the tree for the scene!? That's because `@react-three/fiber` renders to a different react root with it's own reconciler.

## The solution

You use `@react-three/test-renderer` ⚛️-🔼-🧪, an experimental React renderer using `@react-three/fiber` under the hood to expose the scene graph wrapped in a test instance providing helpful utilities to test with.

Essentially, this package makes it easy to grab a snapshot of the Scene Graph rendered by `three` without the need for webgl & browser.

---

## Entry Points

Choose the entry point that matches your `@react-three/fiber` import:

| Your Fiber Import           | Test Renderer Import                | Use Case                              |
| --------------------------- | ----------------------------------- | ------------------------------------- |
| `@react-three/fiber`        | `@react-three/test-renderer`        | Default (WebGPU, mocked GPU context)  |
| `@react-three/fiber/legacy` | `@react-three/test-renderer/legacy` | WebGL only                            |
| `@react-three/fiber/webgpu` | `@react-three/test-renderer/webgpu` | Deprecated, removed in the first beta |

Whichever entry you pick, the root resolves JSX elements from the three namespace of the renderer it loads, exactly as in the app: node materials exist under WebGPU and not under WebGL.

### Default Entry

For applications using the standard fiber import:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Canvas } from '@react-three/fiber'

// Your component
function MyScene() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="blue" />
    </mesh>
  )
}

// Test
const renderer = await ReactThreeTestRenderer.create(<MyScene />)
expect(renderer.scene.children[0].type).toBe('Mesh')
```

### Legacy Entry (WebGL Only)

For applications using legacy WebGL-only rendering:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer/legacy'
import { Canvas } from '@react-three/fiber/legacy'

const renderer = await ReactThreeTestRenderer.create(<MyScene />)
```

### TSL (Three Shading Language)

The default entry renders with `WebGPURenderer`, so node materials and the TSL hooks work without
any setup. `@react-three/test-renderer/webgpu` does the same and is deprecated.

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { color } from 'three/tsl'
// The TSL hooks come from @react-three/tsl, in tests as in app code
import { useUniforms, useNodes } from '@react-three/tsl'

// Component using WebGPU hooks
function MyWebGPUScene() {
  const { uTime } = useUniforms({ uTime: 0 })
  const { colorNode } = useNodes(() => ({
    colorNode: color('#ff0000'),
  }))

  return (
    <mesh>
      <boxGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}

// Test with hook access
const renderer = await ReactThreeTestRenderer.create(<MyWebGPUScene />)
```

---

## Usage

RTTR is testing library agnostic, so we hope that it works with libraries such as [`jest`](https://jestjs.io/), [`jasmine`](https://jasmine.github.io/) etc.

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'

const renderer = await ReactThreeTestRenderer.create(
  <mesh>
    <boxGeometry args={[2, 2]} />
    <meshStandardMaterial
      args={[
        {
          color: 0x0000ff,
        },
      ]}
    />
  </mesh>,
)

// assertions using the TestInstance & Scene Graph
console.log(renderer.toGraph())
```

---

## Testing WebGPU Hooks

Test TSL uniforms and nodes with the default entry and the hooks from `@react-three/tsl`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { color } from 'three/tsl'
import { useUniforms, useNodes } from '@react-three/tsl'

describe('My WebGPU Scene', () => {
  it('should create and use uniforms', async () => {
    let uniforms: any = null

    function TestComponent() {
      uniforms = useUniforms({
        uTime: 0,
        uColor: '#ff0000',
      })
      return null
    }

    const renderer = await ReactThreeTestRenderer.create(<TestComponent />)

    // Assert uniform values
    expect(uniforms.uTime.value).toBe(0)

    // Modify uniform imperatively
    uniforms.uTime.value = 1.5
    expect(uniforms.uTime.value).toBe(1.5)

    await renderer.unmount()
  })

  it('should test nodes with materials', async () => {
    function TestMesh() {
      const { colorNode } = useNodes(() => ({
        colorNode: color('#00ff00'),
      }))

      return (
        <mesh>
          <boxGeometry />
          <meshBasicNodeMaterial colorNode={colorNode} />
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

## Upgrading from v9

v9 had one entry, which rendered with WebGL. In v10 the default entry renders with WebGPU, to match
`@react-three/fiber`. If your app imports `Canvas` from `@react-three/fiber/legacy`, test with the
`/legacy` entry:

```diff
-import ReactThreeTestRenderer from '@react-three/test-renderer'
+import ReactThreeTestRenderer from '@react-three/test-renderer/legacy'
```

---

## API

- [React Three Test Renderer API](./markdown/rttr.md)
- [React Three Test Instance API](./markdown/rttr-instance.md)
- [Testing WebGPU and TSL](https://r3f.docs.pmnd.rs/next/api/testing#testing-webgpu-and-tsl)
