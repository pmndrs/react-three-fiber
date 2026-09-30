---
'@react-three/fiber': patch
---

Only register three.js constructors as JSX intrinsic elements. Non-constructor exports such as constants and `MathUtils` were previously registered with `never` props, which collapsed the props of any `React.ElementType` to `never` once `@react-three/fiber` was imported.
