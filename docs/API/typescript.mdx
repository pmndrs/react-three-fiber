---
title: TypeScript
description: Common scenarios and how to approach them with TypeScript
nav: 9
---

## Typing with `useRef`

React's `useRef` won't automatically infer types despite pointing it to a typed ref.

You can type the ref yourself by passing a type through `useRef`'s generics:

```tsx
import { useRef, useEffect } from 'react'
import { Mesh } from 'three'

function Box(props) {
  const meshRef = useRef<Mesh>(null!)

  useEffect(() => {
    console.log(Boolean(meshRef.current))
  }, [])

  return (
    <mesh {...props} ref={meshRef}>
      <boxGeometry />
      <meshBasicMaterial />
    </mesh>
  )
}
```

The exclamation mark is a non-null assertion that will let TS know that `ref.current` is defined when we access it in effects, useFrame et al. You do not need to check against null, the element is assumed to exist.

## Accessing typed three-elements

Whenever you want to spread props or type components that rely on three elements, you can use the `ThreeElements` interface to extract the mesh, group, or any other three element, including custom elements.

```tsx
import { ThreeElements } from '@react-three/fiber'

type FooProps = ThreeElements['mesh'] & { bar: boolean }

function Foo({ bar, ...props}: FooProps) {
  useEffect(() => {
    console.log(bar)
  }, [bar])
  return <mesh {...props} />
}
```

## Extend usage

react-three-fiber can also accept third-party elements and extend them into its internal catalogue.

```tsx
import { useRef, useEffect } from 'react'
import { GridHelper } from 'three'
import { extend } from '@react-three/fiber'

// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it
extend({ CustomElement })

<customElement />
```

The catalogue teaches the underlying reconciler how to create fibers for these elements and treat them within the scene.

You can then declaratively create custom elements with primitives, but TypeScript won't know about them nor their props.

```html
// error: 'customElement' does not exist on type 'JSX.IntrinsicElements'

<customElement />
```

### Extending ThreeElements

To define our element in JSX, we'll use the `ThreeElement` interface to extend `ThreeElements`. This interface describes three.js classes that are available in the R3F catalog and can be used as native elements.

```tsx
import { useRef, useEffect } from 'react'
import { GridHelper } from 'three'
import { extend, ThreeElement } from '@react-three/fiber'

// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it
extend({ CustomElement })

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    customElement: ThreeElement<typeof CustomElement>
  }
}

// react-three-fiber will create your custom component and TypeScript will understand it
<customComponent />
```

You can shorten element definition by using the `extend` factory signature, which will automatically extend the element locally. This will also prevent namespace bleeding.

```tsx
// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it, types will be inferred
const Element = extend(CustomElement)

// react-three-fiber will create your custom component and TypeScript will understand it
<Element />
```

## Extending three default elements

If you open your own root instead of using `<Canvas>`, you can extend the default elements with `extend`. But keep in mind that the `* as THREE` namespace contains classes, functions, numbers, strings. At the moment we suggest you use `any` or `@ts-ignore` unless you extract the exact classes you need (`extend({ Mesh, Group, ... })`).

```tsx
import * as THREE from 'three'
import { extend, createRoot, events } from '@react-three/fiber'

// Register the THREE namespace as native JSX elements.
extend(THREE as any)

// Create a react root
const root = createRoot(document.querySelector('canvas'))
```

## Exported types

react-three-fiber is extensible and exports types for its internals, such as render props, canvas props, and events:

```tsx
// Event raycaster intersection
Intersection

// `useFrame` internal subscription and render callback
Subscription
RenderCallback

// `useThree`'s returned internal state
RootState
Performance
Dpr
Size
Viewport
Camera

// Canvas props
CanvasProps

// Supported events
Events

// Event manager signature (is completely modular)
EventManager

// Wraps a platform event as it's passed through the event manager
ThreeEvent
```
