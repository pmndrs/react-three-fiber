Calling `Loader.load()` or `Loader.loadAsync()` inside `useEffect` or `useLayoutEffect` bypasses
React Suspense and the built-in caching that `useLoader` provides. Prefer `useLoader` for
declarative, cached asset loading that integrates with Suspense boundaries.

#### ❌ Incorrect

Loading a texture imperatively inside an effect misses Suspense integration and caching.

```js
function MyMesh({ url }) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    new TextureLoader().load(url, (t) => {
      setTexture(t)
    })
  }, [url])

  return <mesh>{texture && <meshBasicMaterial map={texture} />}</mesh>
}
```

Loading asynchronously inside an effect has the same problem.

```js
function MyModel({ url }) {
  const [gltf, setGltf] = useState(null)

  useEffect(() => {
    new GLTFLoader().loadAsync(url).then((result) => {
      setGltf(result)
    })
  }, [url])

  return gltf ? <primitive object={gltf.scene} /> : null
}
```

#### ✅ Correct

Using `useLoader` integrates with Suspense and caches the result automatically.

```js
function MyMesh({ url }) {
  const texture = useLoader(TextureLoader, url)

  return (
    <mesh>
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}
```

```js
function MyModel({ url }) {
  const gltf = useLoader(GLTFLoader, url)

  return <primitive object={gltf.scene} />
}
```
