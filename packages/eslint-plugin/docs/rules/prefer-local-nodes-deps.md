`useLocalNodes` works like `useMemo`: without a dependency array it runs its creator on every render. For an inline creator that means a new TSL graph each time the component renders, and a shader recompile for every material using it.

Pass `[]` for the normal case: the graph is built once, and `useLocalNodes` still rebuilds it when a shared resource the creator reads (a uniform, node, buffer or texture) is replaced, or on a hot update.

A value from the component that changes over time - a color prop, a slider, a strength - belongs in a uniform (`useUniforms`). Updating a uniform reaches the GPU without rebuilding the graph. Put a value in the array only when it changes the structure of the graph: which node to use, how many octaves a loop unrolls, whether a branch exists.

The rule does not ask for every captured value to be declared, the way `react-hooks/exhaustive-deps` would: that would steer changing values into the array, rebuilding the graph whenever they change.

#### ❌ Incorrect

This rebuilds the fog graph on every render.

```js
function Fog() {
  const { fogNode } = useLocalNodes(({ uniforms }) => ({
    fogNode: fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far)),
  }))
}
```

This rebuilds the graph on every render and bakes in `color`, so the color only changes on a rebuild.

```js
function Tinted({ color }) {
  const { colorNode } = useLocalNodes(({ uniforms }) => ({
    colorNode: mix(uniforms.uBase, color, 0.5),
  }))
}
```

#### ✅ Correct

The graph is built once.

```js
function Fog() {
  const { fogNode } = useLocalNodes(
    ({ uniforms }) => ({
      fogNode: fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far)),
    }),
    [],
  )
}
```

The changing value goes through a uniform, so the graph is built once and the color updates live.

```js
function Tinted({ color }) {
  useUniforms({ uTint: color }, 'tinted')
  const { colorNode } = useLocalNodes(
    ({ uniforms }) => ({
      colorNode: mix(uniforms.uBase, uniforms.scope('tinted').uTint, 0.5),
    }),
    [],
  )
}
```

A value that decides the structure of the graph is declared.

```js
function Pattern({ pattern }) {
  const { result } = useLocalNodes(
    ({ nodes }) => ({ result: pattern === 'noise' ? nodes.noise : nodes.stripes }),
    [pattern],
  )
}
```
