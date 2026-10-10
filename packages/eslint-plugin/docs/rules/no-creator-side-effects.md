The creators passed to `useNodes`, `useLocalNodes`, `useUniforms`, `useBuffers` and
`useGPUStorage` run during render. React can discard a render or run it twice (StrictMode), so a
creator must only build values. Assigning to the scene, camera or renderer there can leave a node
installed by a render that never committed, or install it twice.

To put a node onto a three.js object, use `useLocalNodes` and return a **function** that assigns it.
It runs after commit, and may return a cleanup.

A `useNodes` or `useLocalNodes` creator that returns nothing is reported too: it registers nothing,
and usually means a mutation was made instead.

#### ❌ Incorrect

```js
useLocalNodes(({ scene, uniforms }) => {
  scene.fogNode = fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far))
}, [])
```

```js
useNodes(({ scene }) => {
  scene.backgroundNode = color(0x000000)
})
```

#### ✅ Correct

```js
useLocalNodes(({ scene, uniforms }) => {
  const fogNode = fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far))
  return () => {
    scene.fogNode = fogNode
    return () => {
      scene.fogNode = null
    }
  }
}, [])
```
