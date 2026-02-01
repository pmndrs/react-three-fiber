# WobblePhysics.ts vs Unity Liquid.cs — Comparison

## Bugs (FIXED)

### Quaternion self-aliasing and input mutation

- **Unity**: `lastFrameRotation * Quaternion.Inverse(foreLastFrameRotation)` — quaternions are value types (structs) in C#, so no mutation occurs.
- **Three.js (original)**: `this._q.copy(rotation).multiply(this._q.copy(this.lastRot).invert())` — two problems:
  1. `_q` was used as both the target and the inverse operand in the same expression.
  2. `rotation` (a reference type) was mutated via `.multiply()`, corrupting the caller's quaternion every frame.
- **Fix**: Added `_q2` as a second scratch quaternion. Now `_q` copies `rotation`, and `_q2` holds the inverted `lastRot`.

## Previously Missing Features (NOW PORTED)

### CompensateShapeAmount / UpdatePos / GetLowestPoint

- Unity iterates all mesh vertices in world space to find the lowest Y, then smoothly compensates fill height.
- Now ported as `computeFillPosition(mesh, delta)` + `getLowestPoint(mesh)`. Uses `mesh.geometry` position attribute and `localToWorld()` — direct equivalent of Unity's vertex iteration.
- Exposes `fillOffset` as a full `Vector3` matching Unity's `pos` passed to `_FillAmount`.

### Thickness parameter

- Unity exposes a `Thickness` field (default 1) used as the lower clamp bound in the sinewave lerp.
- Now ported as `thickness` property, used in `THREE.MathUtils.clamp(mag, this.thickness, 10)`.

### Mesh bounds center

- Unity computes `transform.TransformPoint(mesh.bounds.center)` for fill position.
- Now ported using `geometry.boundingBox.getCenter()` + `mesh.localToWorld()`.

### fillAmount used in fill position

- Unity uses `fillAmount` in `UpdatePos` to offset the fill plane.
- Now used in `computeFillPosition()` matching the Unity formula.

## Intentional Differences (non-breaking)

### UpdateMode (scaled vs unscaled time)

- Unity supports `Normal` (Time.deltaTime) and `UnscaledTime` (Time.unscaledDeltaTime).
- Omitted — R3F's `useFrame` delta handles time scaling externally. The consumer controls what delta is passed.

### Angular velocity delta source

- Unity's `GetAngularVelocity` uses the global `Time.deltaTime` for division.
- The TS port uses the explicitly passed `delta` parameter, which is more correct (no global dependency).

### First-frame guard

- Unity has no explicit first-frame guard — relies on `lastPos`/`lastRot` being zero-initialized.
- TS port explicitly seeds `lastPos`/`lastRot` on first call to avoid a velocity spike from (0,0,0).

### Material/shader integration

- Unity sets `_WobbleX`, `_WobbleZ`, and `_FillAmount` on `rend.sharedMaterial` directly.
- The TS port exposes `wobbleX`, `wobbleZ`, and `fillOffset` as public fields consumed by TSL uniforms. Architectural difference appropriate for R3F.
