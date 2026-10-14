---
'@react-three/fiber': patch
---

Stop `createPortal` from leaking: a portal now unsubscribes from its parent store when it unmounts (#3676), and its `setEvents` no longer keeps every earlier portal state alive (#3751). Ports both fixes from v10.
