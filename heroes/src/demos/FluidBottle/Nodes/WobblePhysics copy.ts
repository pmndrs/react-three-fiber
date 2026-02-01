import * as THREE from 'three'

/**
 * Port of Minion Art's Unity Liquid.cs wobble physics.
 * Tracks object velocity & angular velocity, produces damped sine-wave wobble values.
 */
export class WobblePhysics {
  maxWobble = 0.03
  wobbleSpeed = 1
  recovery = 1
  fillAmount = 0.5

  wobbleX = 0
  wobbleZ = 0

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
      delta * THREE.MathUtils.clamp(mag, 1, 10),
    )

    this.wobbleX = this.wobbleAddX * this.sinewave
    this.wobbleZ = this.wobbleAddZ * this.sinewave

    // Velocity
    this.velocity.subVectors(this.lastPos, position).divideScalar(delta)

    // Angular velocity from quaternion difference
    this._q.copy(rotation).multiply(this._q.copy(this.lastRot).invert())
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

    // Store for next frame
    this.lastPos.copy(position)
    this.lastRot.copy(rotation)
  }
}
