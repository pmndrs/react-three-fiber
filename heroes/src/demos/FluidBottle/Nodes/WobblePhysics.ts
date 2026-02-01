import * as THREE from 'three'

/**
 * Port of Minion Art's Unity Liquid.cs wobble physics.
 * Tracks object velocity & angular velocity, produces damped sine-wave wobble values.
 * Computes fill position with shape compensation from mesh vertex iteration.
 */
export class WobblePhysics {
  maxWobble = 0.03
  wobbleSpeed = 1
  recovery = 1
  thickness = 1
  fillAmount = 0.5
  compensateAmount = 0

  wobbleX = 0
  wobbleZ = 0
  /** Fill position offset — matches Unity's `pos` passed to `_FillAmount`. */
  fillOffset = new THREE.Vector3()

  private wobbleAddX = 0
  private wobbleAddZ = 0
  private pulse = 0
  private sinewave = 0
  private time = 0.5

  private lastPos = new THREE.Vector3()
  private lastRot = new THREE.Quaternion()
  private velocity = new THREE.Vector3()
  private angularVelocity = new THREE.Vector3()

  // scratch
  private _q = new THREE.Quaternion()
  private _q2 = new THREE.Quaternion()
  private _comp = new THREE.Vector3()
  private _worldPos = new THREE.Vector3()
  private _vert = new THREE.Vector3()
  private initialized = false

  update(position: THREE.Vector3, rotation: THREE.Quaternion, delta: number) {
    if (delta === 0) return

    // First frame: seed last pos/rot to avoid velocity spike
    if (!this.initialized) {
      this.lastPos.copy(position)
      this.lastRot.copy(rotation)
      this.initialized = true
      return
    }

    this.time += delta

    // Decay wobble
    this.wobbleAddX = THREE.MathUtils.lerp(this.wobbleAddX, 0, delta * this.recovery)
    this.wobbleAddZ = THREE.MathUtils.lerp(this.wobbleAddZ, 0, delta * this.recovery)

    // Sine wave modulation
    this.pulse = 2 * Math.PI * this.wobbleSpeed
    const mag = this.velocity.length() + this.angularVelocity.length()
    this.sinewave = THREE.MathUtils.lerp(
      this.sinewave,
      Math.sin(this.pulse * this.time),
      delta * THREE.MathUtils.clamp(mag, this.thickness, 10),
    )

    this.wobbleX = this.wobbleAddX * this.sinewave
    this.wobbleZ = this.wobbleAddZ * this.sinewave

    // Velocity
    this.velocity.subVectors(this.lastPos, position).divideScalar(delta)

    // Angular velocity from quaternion difference
    this._q.copy(rotation).multiply(this._q2.copy(this.lastRot).invert())
    const qw = this._q.w
    if (Math.abs(qw) < 1023.5 / 1024.0) {
      const sign = qw < 0 ? -1 : 1
      const angle = Math.acos(Math.abs(qw))
      const gain = (sign * 2.0 * angle) / (Math.sin(angle) * delta)
      this.angularVelocity.set(this._q.x * gain, this._q.y * gain, this._q.z * gain)
      if (!isFinite(this.angularVelocity.x)) this.angularVelocity.set(0, 0, 0)
    } else {
      this.angularVelocity.set(0, 0, 0)
    }

    // Add clamped velocity to wobble
    const vx = this.velocity.x + this.velocity.y * 0.2 + this.angularVelocity.z + this.angularVelocity.y
    const vz = this.velocity.z + this.velocity.y * 0.2 + this.angularVelocity.x + this.angularVelocity.y
    this.wobbleAddX += THREE.MathUtils.clamp(vx * this.maxWobble, -this.maxWobble, this.maxWobble)
    this.wobbleAddZ += THREE.MathUtils.clamp(vz * this.maxWobble, -this.maxWobble, this.maxWobble)

    // Clamp accumulated wobble — Unity's lerp decay can't keep up with sustained
    // high-frequency input (e.g. TransformControls drag), causing the fill plane
    // to tilt near-vertical. Cap at 10× single-frame max (~17° tilt).
    const wobbleCap = this.maxWobble * 10
    this.wobbleAddX = THREE.MathUtils.clamp(this.wobbleAddX, -wobbleCap, wobbleCap)
    this.wobbleAddZ = THREE.MathUtils.clamp(this.wobbleAddZ, -wobbleCap, wobbleCap)

    // Store for next frame
    this.lastPos.copy(position)
    this.lastRot.copy(rotation)
  }

  /**
   * Compute fill position with shape compensation.
   * Matches Unity's UpdatePos() + GetLowestPoint().
   * Call after update() each frame.
   */
  computeFillPosition(mesh: THREE.Mesh, delta: number) {
    const geometry = mesh.geometry
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    const center = geometry.boundingBox!.getCenter(this._worldPos)

    const bb = geometry.boundingBox!
    // Map fillAmount (0 = empty, 1 = full) to local Y within bounding box
    const fillY = THREE.MathUtils.lerp(bb.min.y, bb.max.y, this.fillAmount)

    if (this.compensateAmount > 0) {
      const lowestY = this.getLowestPoint(mesh)
      const worldPos = mesh.localToWorld(this._vert.copy(center))
      const target = this._worldPos.set(worldPos.x, worldPos.y - lowestY, worldPos.z)

      if (delta !== 0) {
        this._comp.lerp(target, delta * 10)
      } else {
        this._comp.copy(target)
      }

      this.fillOffset.set(center.x, fillY + this._comp.y * this.compensateAmount, center.z)
    } else {
      // Local fill Y level. objectWorldY is added in the shader, so this must stay local.
      this.fillOffset.set(center.x, fillY, center.z)
    }
  }

  /**
   * Find the lowest world-space Y vertex of the mesh.
   * Matches Unity's GetLowestPoint().
   * This method is super agressive, a bounding box check would be much better
   */
  private getLowestPoint(mesh: THREE.Mesh): number {
    const posAttr = mesh.geometry.getAttribute('position')
    let lowestY = Infinity
    let lowestVertY = 0

    for (let i = 0; i < posAttr.count; i++) {
      this._vert.fromBufferAttribute(posAttr, i)
      mesh.localToWorld(this._vert)
      if (this._vert.y < lowestY) {
        lowestY = this._vert.y
        lowestVertY = this._vert.y
      }
    }

    return lowestVertY
  }
}
