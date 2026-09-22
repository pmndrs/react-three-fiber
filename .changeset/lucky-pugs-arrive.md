---
'@react-three/fiber': minor
---

Support React 19.3. Transitions that touch a `<ViewTransition>` subtree inside the canvas now commit synchronously, mirroring react-dom in browsers without view transitions, instead of leaving the reconciler stuck mid-commit.
