---
'@react-three/fiber': patch
---

Fix memory leak during unmount in development: unmount container in a single commit and flush passive effect cleanups before teardown (#4054).
