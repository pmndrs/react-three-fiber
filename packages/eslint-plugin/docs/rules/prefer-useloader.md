Loading assets with `Loader.load()` or `Loader.loadAsync()` inside a `useEffect` bypasses
R3F's built-in caching and Suspense integration. Use `useLoader` instead to de-duplicate
resources on both CPU and GPU, integrate with React Suspense boundaries, and avoid
expensive runtime recompilation.

#### ❌ Incorrect

Loading a texture imperatively in an effect misses caching and Suspense integration.

```js
function TexturedBox() {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    new TextureLoader().load('/wood.png', (t) => {
      setTexture(t)
    })
  }, [])

  if (!texture) return null
  return (
    <mesh>
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

#### ✅ Correct

Use `useLoader` for automatic caching, de-duplication, and Suspense support.

```js
function TexturedBox() {
  const texture = useLoader(TextureLoader, '/wood.png')

  return (
    <mesh>
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

For multiple assets, `useLoader` accepts arrays and de-duplicates automatically:

```js
function Scene() {
  const [wood, metal] = useLoader(TextureLoader, ['/wood.png', '/metal.png'])

  return (
    <>
      <mesh>
        <meshStandardMaterial map={wood} />
      </mesh>
      <mesh>
        <meshStandardMaterial map={metal} />
      </mesh>
    </>
  )
}
```
