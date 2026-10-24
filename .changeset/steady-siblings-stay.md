---
'@react-three/fiber': patch
---

fix: keep a reconstructed object's place among its siblings. Changing `args` (or the `object` of a `<primitive />`) rebuilt the object and appended it to the end of its parent's `children`, which changed sibling order, render order and index-based lookups.
