---
'@react-three/fiber': patch
---

`useFrame` now allows its first argument to be `undefined`. This is useful in situations where you want to _conditionally_ register a frame callback, but can't wrap the actual `useFrame` invocation in a conditional statement, because React will not allow that.

Example:

```jsx
const Component = ({ animate = false }) => {
  useFrame(
    animate
      ? () => {
          // do something
        }
      : undefined,
  )

  /* ... */
}
```
