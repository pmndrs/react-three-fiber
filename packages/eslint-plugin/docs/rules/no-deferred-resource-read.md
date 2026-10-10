`useLocalNodes` rebuilds its graph when a shared resource the creator read is replaced: a uniform,
node, buffer, storage buffer or texture. It can only see reads made **while the creator runs**. The
body of `Fn(() => ...)` runs later, while three builds the shader, so a resource looked up inside
`Fn` is not tracked: replacing it does not rebuild the graph, and the graph keeps using the old one.
(R3F logs a development warning when it happens.)

Read the resource in the creator and close over it.

#### ❌ Incorrect

```js
useLocalNodes(({ uniforms }) => ({ effect: Fn(() => uniforms.uStrength.mul(2)) }), [])
```

```js
useLocalNodes((state) => ({ effect: Fn(() => state.nodes.noise.mul(2)) }), [])
```

#### ✅ Correct

```js
useLocalNodes(({ uniforms }) => {
  const strength = uniforms.uStrength
  return { effect: Fn(() => strength.mul(2)) }
}, [])
```
