Setting the scene background with `<color attach="background">` is deprecated in v10 in favor of
the Canvas `background` prop, which also takes environment presets, HDR files and separate
background and environment maps.

Only a `<color attach="background">` placed directly inside a `<Canvas>` from `@react-three/fiber` is
reported. Portals, `<View>`s and render targets have scenes of their own, which the Canvas prop does
not reach, so the pattern stays the way to set their background.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
<Canvas>
  <color attach="background" args={['#1a1a2e']} />
  <Scene />
</Canvas>
```

#### ✅ Correct

```js
<Canvas background="#1a1a2e">
  <Scene />
</Canvas>
```

```js
<Canvas background="sunset">
  <Scene />
</Canvas>
```
