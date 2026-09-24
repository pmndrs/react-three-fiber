---
'@react-three/fiber': patch
---

Model root teardown with explicit open, closing, disposing, and disposed states. Allow pending unmounts to be cancelled, wait for React cleanups and queued configuration before disposing, and prevent disposed root handles from configuring or unmounting replacement roots. Complete teardown callbacks after asynchronous renderer disposal settles, and release the context even if renderer disposal fails.
