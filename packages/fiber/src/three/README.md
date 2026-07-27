# Internal Three.js Re-exports

This directory is the single source of truth for Three.js imports within R3F. All internal code
imports from `#three`, never from `three` directly — the build points that alias at `index.ts`,
`legacy.ts` or `webgpu.ts` depending on which entry it is producing.

Adding a THREE.js import means adding it to the file for the entries that should have it.

📖 **Full documentation:** [`docs/development/BUILD.md`](../../../../docs/development/BUILD.md#per-entry-alias-resolution)
