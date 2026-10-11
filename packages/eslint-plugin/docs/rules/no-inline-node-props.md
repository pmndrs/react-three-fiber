When a prop ending in `Node` changes on a material (`colorNode`, `positionNode`, `opacityNode`, ...),
R3F sets `material.needsUpdate`, which recompiles the material's shader. Node props are compared by
reference, so a node built inline in JSX is a new node on every render, and the shader recompiles
on every render.

Build the node once with `useLocalNodes(creator, [])` (or `useMemo`), and drive values that change
through uniforms, which update without a recompile.

The rule reports calls and `new` expressions passed to a `*Node` prop of a `*Material` element.
`fromRef(...)` is allowed.

#### ❌ Incorrect

```js
function Wobble() {
  return <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(sin(time)))} />
}
```

```js
function Tinted({ uniforms }) {
  return <meshBasicNodeMaterial colorNode={uniforms.uColor.mul(2)} />
}
```

#### ✅ Correct

```js
function Wobble() {
  const { positionNode } = useLocalNodes(() => ({ positionNode: positionLocal.add(normalLocal.mul(sin(time))) }), [])
  return <meshStandardNodeMaterial positionNode={positionNode} />
}
```
