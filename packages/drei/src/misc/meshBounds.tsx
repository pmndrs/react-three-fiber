import { Raycaster, Matrix4, Ray, Sphere, Vector3, Intersection } from 'three'

let _inverseMatrix = new Matrix4()
let _ray = new Ray()
let _sphere = new Sphere()
let _vA = new Vector3()

export function meshBounds(raycaster: Raycaster, intersects: Intersection[]) {
  let geometry = this.geometry
  let material = this.material
  let matrixWorld = this.matrixWorld
  if (material === undefined) return
  // Checking boundingSphere distance to ray
  if (geometry.boundingSphere === null) geometry.computeBoundingSphere()
  _sphere.copy(geometry.boundingSphere)
  _sphere.applyMatrix4(matrixWorld)
  if (raycaster.ray.intersectsSphere(_sphere) === false) return
  _inverseMatrix.getInverse(matrixWorld)
  _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix)
  // Check boundingBox before continuing
  if (geometry.boundingBox !== null && _ray.intersectBox(geometry.boundingBox, _vA) === null) return
  intersects.push({
    distance: _vA.distanceTo(raycaster.ray.origin),
    point: _vA.clone(),
    object: this,
  })
}
