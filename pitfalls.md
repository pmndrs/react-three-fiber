# Performance pitfalls ☠️

❌ **Never, ever, setState animations:**

```jsx
const [x, setX] = useState(0)
useFrame(() => setX(x => x + 0.01))
// Or, just as bad ...
// useEffect(() => void setInterval(() => setX(x => x + 0.01), 30), [])
return <mesh position-x={x} />
```

You are forcing a full component (+ its children) through React and its diffing mechanism 60 times per second.

✅ Instead, use refs and mutate! This is totally fine and that's how you would do it in plain Threejs as well.

```jsx
const ref = useRef()
useFrame(() => ref.current.position.x += 0.01)
return <mesh ref={ref} />
```

❌ **Never let React anywhere near animated updates!**

Instead use animation libs that animate outside of React! Avoid libs like react-motion that re-render the component 60fps!

✅ For instance [lerp](https://github.com/mattdesl/lerp):

```jsx
import lerp from 'lerp'

function Signal({ active }) {
  const ref = useRef()
  useFrame(() => ref.current.position.x = lerp(ref.current.position.x, active ? 100 : 0, 0.1))
  return <mesh ref={ref} />
```

✅ Or [react-spring](https://github.com/react-spring/react-spring):

```jsx
import { a, useSpring } from 'react-spring/three'

function Signal({ active }) {
  const { x } = useSpring({ x: active ? 100 : 0 })
  return <a.mesh position-x={x} />
```

❌ **Never bind often occuring reactive state to a component**

Using state-managers and selected state is fine, but not for updates that happen rapidly!

```jsx
import { useSelector } from 'react-redux'

// Assuming that x gets animated inside the store, triggering the component 60fps
const x = useSelector(state => state.x)
return <mesh position-x={x} />
```

✅ Fetch state directly, for instance using [zustand](https://github.com/react-spring/zustand):

```jsx
useFrame(() => ref.current.position.x = api.getState().x)
return <mesh ref={ref} />
```
