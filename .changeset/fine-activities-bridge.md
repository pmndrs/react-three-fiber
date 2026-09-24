---
'@react-three/fiber': patch
---

Update its-fine to 2.1.0 and bridge ancestor Activity visibility into the Canvas scene on React 19.2 and later. Hiding an Activity disconnects scene effects and useFrame subscriptions; revealing it reconnects them without resetting scene state. Keep the existing context and StrictMode bridges, and fall back to their previous behavior on React 19.0 and 19.1.
