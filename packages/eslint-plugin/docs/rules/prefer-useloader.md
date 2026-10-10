Calling a three.js loader's `load()` or `loadAsync()` inside an effect or memo loads the asset once
per component instance, outside of Suspense. Two components that load the same file fetch, parse
and upload it to the GPU twice, and the component has to render a placeholder state by hand while
it waits.

`useLoader` (and `useTexture` for textures) suspends while loading and caches by URL, so every
component that asks for the same asset shares one copy on both the CPU and the GPU.

The rule reports `load()` and `loadAsync()` called on a `new XLoader()`, or on a variable initialised
with one, inside the callback of `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useMemo` or a
`useState` initialiser. Loading from event handlers and other code is not reported.

#### ❌ Incorrect

```js
function Wood() {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    new TextureLoader().load('/wood.png', setTexture)
  }, [])

  if (!texture) return null
  return <meshStandardMaterial map={texture} />
}
```

```js
const loader = new GLTFLoader()

function Model({ url }) {
  const gltf = useMemo(() => loader.loadAsync(url), [url])
  // ...
}
```

#### ✅ Correct

```js
function Wood() {
  const texture = useLoader(TextureLoader, '/wood.png')
  return <meshStandardMaterial map={texture} />
}
```

```js
function Wood() {
  const texture = useTexture('/wood.png')
  return <meshStandardMaterial map={texture} />
}
```

Several assets load in parallel, and each is cached separately:

```js
function Materials() {
  const [wood, metal] = useLoader(TextureLoader, ['/wood.png', '/metal.png'])
  // ...
}
```
