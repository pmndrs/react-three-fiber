# 2.0 ⚡️

- Defaults to compressed output
- Bugfixes, making loading GLTF's under Node safer
- Typescript support
- Cleaning up the output, removing unused hooks, etc
- Prettier 2.x

# 1.0 🎉

![](https://i.imgur.com/ZB4uUaz.png)

Click this link to see it in action: https://twitter.com/0xca0a/status/1224335000755146753

This is a major release with breaking changes.

It uses react-three-fiber's useLoader `node` and `material` look-up tables which were introduced in => 4.0.13:

```jsx
const { nodes, materials, animations, scene } = useLoader(GLTFLoader, url)

return <mesh material={materials['base']} geometry={nodes['Cube.003_0'].geometry} />
```

The previous `__$` array does not work with three's new async DRACOLoader any longer because the indicies would be subject to race conditions. Named tables are cleaner, look better and are easier to use.

Other changes:

- GLTFLoader bugfixes (fixed some of the reported crashes).
- It references materials instead of spreading props, which was causing issues. This also means that materials are actually re-used, which wasn't the case before.
- Exports lights and cameras, if present.
- Optional removal of empty nodes.
- Optional removal of names.
- Turns Object3D collections into Groups (should be better for performance).
- Converts angles into fractions of PI.
- Floating point precision and shorter numbers.
- Formats the output using prettier.
- Demo example.
