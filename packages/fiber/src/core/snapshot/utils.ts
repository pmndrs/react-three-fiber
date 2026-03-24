import * as THREE from 'three'
import type {
  Object3DState,
  CameraState,
  MaterialState,
  LightState,
  SceneState,
  Snapshot,
  SnapshotExportFormat,
} from './types'

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function serializeVector3(vec: THREE.Vector3 | THREE.Euler): [number, number, number] {
  return [vec.x, vec.y, vec.z]
}

export function deserializeVector3(data: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(...data)
}

export function deserializeEuler(data: [number, number, number]): THREE.Euler {
  return new THREE.Euler(...data)
}

export function serializeMatrix4(matrix: THREE.Matrix4): number[] {
  return Array.from(matrix.elements)
}

export function deserializeMatrix4(data: number[]): THREE.Matrix4 {
  const matrix = new THREE.Matrix4()
  matrix.fromArray(data)
  return matrix
}

export function serializeColor(color: THREE.Color | string | number): string {
  if (typeof color === 'string') return color
  if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0')
  return '#' + color.getHexString()
}

export function captureObject3DState(obj: THREE.Object3D, deep = true): Object3DState {
  const state: Object3DState = {
    id: obj.uuid,
    name: obj.name,
    type: obj.type,
    position: serializeVector3(obj.position),
    rotation: serializeVector3(obj.rotation),
    scale: serializeVector3(obj.scale),
    visible: obj.visible,
    matrix: serializeMatrix4(obj.matrix),
    children: [],
  }

  if (deep) {
    state.children = obj.children.map((child) => captureObject3DState(child, deep))
  }

  return state
}

export function restoreObject3DState(obj: THREE.Object3D, state: Object3DState, deep = true): void {
  obj.position.fromArray(state.position)
  obj.rotation.fromArray(state.rotation)
  obj.scale.fromArray(state.scale)
  obj.visible = state.visible
  obj.matrix.fromArray(state.matrix)
  obj.matrix.decompose(obj.position, obj.quaternion, obj.scale)

  if (deep && state.children.length > 0) {
    state.children.forEach((childState, index) => {
      if (obj.children[index]) {
        restoreObject3DState(obj.children[index], childState, deep)
      }
    })
  }
}

export function captureCameraState(camera: THREE.Camera): CameraState {
  const state: CameraState = {
    type: camera.type,
    position: serializeVector3(camera.position),
    rotation: serializeVector3(camera.rotation),
  }

  if (camera instanceof THREE.PerspectiveCamera) {
    state.fov = camera.fov
    state.near = camera.near
    state.far = camera.far
  } else if (camera instanceof THREE.OrthographicCamera) {
    state.zoom = camera.zoom
    state.left = camera.left
    state.right = camera.right
    state.top = camera.top
    state.bottom = camera.bottom
    state.near = camera.near
    state.far = camera.far
  }

  return state
}

export function restoreCameraState(camera: THREE.Camera, state: CameraState): void {
  camera.position.fromArray(state.position)
  camera.rotation.fromArray(state.rotation)

  if (camera instanceof THREE.PerspectiveCamera && state.fov !== undefined) {
    camera.fov = state.fov
    camera.near = state.near ?? camera.near
    camera.far = state.far ?? camera.far
    camera.updateProjectionMatrix()
  } else if (camera instanceof THREE.OrthographicCamera && state.zoom !== undefined) {
    camera.zoom = state.zoom
    camera.left = state.left ?? camera.left
    camera.right = state.right ?? camera.right
    camera.top = state.top ?? camera.top
    camera.bottom = state.bottom ?? camera.bottom
    camera.near = state.near ?? camera.near
    camera.far = state.far ?? camera.far
    camera.updateProjectionMatrix()
  }
}

export function captureMaterialState(material: THREE.Material): MaterialState {
  const state: MaterialState = {
    id: material.uuid,
    name: material.name,
    type: material.type,
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side,
  }

  const mat = material as any
  if (mat.color) state.color = serializeColor(mat.color)
  if (mat.emissive) state.emissive = serializeColor(mat.emissive)
  if (mat.emissiveIntensity !== undefined) state.emissiveIntensity = mat.emissiveIntensity
  if (mat.roughness !== undefined) state.roughness = mat.roughness
  if (mat.metalness !== undefined) state.metalness = mat.metalness
  if (mat.wireframe !== undefined) state.wireframe = mat.wireframe

  return state
}

export function restoreMaterialState(material: THREE.Material, state: MaterialState): void {
  material.transparent = state.transparent ?? material.transparent
  material.opacity = state.opacity ?? material.opacity
  material.side = (state.side as THREE.Side) ?? material.side

  const mat = material as any
  if (state.color !== undefined && mat.color) {
    mat.color.set(state.color)
  }
  if (state.emissive !== undefined && mat.emissive) {
    mat.emissive.set(state.emissive)
  }
  if (state.emissiveIntensity !== undefined && mat.emissiveIntensity !== undefined) {
    mat.emissiveIntensity = state.emissiveIntensity
  }
  if (state.roughness !== undefined && mat.roughness !== undefined) {
    mat.roughness = state.roughness
  }
  if (state.metalness !== undefined && mat.metalness !== undefined) {
    mat.metalness = state.metalness
  }
  if (state.wireframe !== undefined && mat.wireframe !== undefined) {
    mat.wireframe = state.wireframe
  }
}

export function captureLightState(light: THREE.Light): LightState {
  const state: LightState = {
    id: light.uuid,
    type: light.type,
    position: serializeVector3(light.position),
    color: serializeColor(light.color),
    intensity: light.intensity,
    castShadow: light.castShadow,
  }

  if (light instanceof THREE.SpotLight) {
    state.distance = light.distance
    state.angle = light.angle
    state.penumbra = light.penumbra
  } else if (light instanceof THREE.PointLight) {
    state.distance = light.distance
  }

  return state
}

export function restoreLightState(light: THREE.Light, state: LightState): void {
  light.position.fromArray(state.position)
  light.color.set(state.color)
  light.intensity = state.intensity
  light.castShadow = state.castShadow ?? light.castShadow

  if (light instanceof THREE.SpotLight) {
    light.distance = state.distance ?? light.distance
    light.angle = state.angle ?? light.angle
    light.penumbra = state.penumbra ?? light.penumbra
  } else if (light instanceof THREE.PointLight) {
    light.distance = state.distance ?? light.distance
  }
}

export function captureSceneState(
  scene: THREE.Scene,
  options: { includeMaterials?: boolean; includeLights?: boolean; deepTraversal?: boolean } = {},
): SceneState {
  const { includeMaterials = true, includeLights = true, deepTraversal = true } = options

  const state: SceneState = {
    objects: [],
    materials: [],
    lights: [],
  }

  const objects = deepTraversal ? scene.children : scene.children.filter((child) => !child.type.includes('Light'))

  state.objects = objects.map((obj) => captureObject3DState(obj, deepTraversal))

  if (includeMaterials) {
    const materials = new Map<string, THREE.Material>()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => materials.set(mat.uuid, mat))
        } else {
          materials.set(mesh.material.uuid, mesh.material)
        }
      }
    })
    state.materials = Array.from(materials.values()).map(captureMaterialState)
  }

  if (includeLights) {
    const lights: THREE.Light[] = []
    scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        lights.push(obj as THREE.Light)
      }
    })
    state.lights = lights.map(captureLightState)
  }

  return state
}

export function restoreSceneState(scene: THREE.Scene, state: SceneState, deep = true): void {
  const objectMap = new Map<string, THREE.Object3D>()
  scene.traverse((obj) => objectMap.set(obj.uuid, obj))

  state.objects.forEach((objState) => {
    const obj = objectMap.get(objState.id)
    if (obj) {
      restoreObject3DState(obj, objState, deep)
    }
  })

  if (state.materials) {
    const materialMap = new Map<string, THREE.Material>()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => materialMap.set(mat.uuid, mat))
        } else {
          materialMap.set(mesh.material.uuid, mesh.material)
        }
      }
    })

    state.materials.forEach((matState) => {
      const material = materialMap.get(matState.id)
      if (material) {
        restoreMaterialState(material, matState)
      }
    })
  }

  if (state.lights) {
    const lightMap = new Map<string, THREE.Light>()
    scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        lightMap.set(obj.uuid, obj as THREE.Light)
      }
    })

    state.lights.forEach((lightState) => {
      const light = lightMap.get(lightState.id)
      if (light) {
        restoreLightState(light, lightState)
      }
    })
  }
}

export function createSnapshot(
  name: string,
  camera: THREE.Camera,
  scene: THREE.Scene,
  options: { includeMaterials?: boolean; includeLights?: boolean; deepTraversal?: boolean } = {},
): Snapshot {
  return {
    id: generateId(),
    name,
    timestamp: Date.now(),
    camera: captureCameraState(camera),
    scene: captureSceneState(scene, options),
    metadata: {},
  }
}

export function restoreSnapshot(
  snapshot: Snapshot,
  camera: THREE.Camera,
  scene: THREE.Scene,
  options: { restoreCamera?: boolean; restoreScene?: boolean } = {},
): void {
  const { restoreCamera = true, restoreScene = true } = options

  if (restoreCamera) {
    restoreCameraState(camera, snapshot.camera)
  }

  if (restoreScene) {
    restoreSceneState(scene, snapshot.scene)
  }
}

export function exportSnapshots(
  snapshots: Snapshot[],
  metadata?: Record<string, any>,
): string {
  const exportData: SnapshotExportFormat = {
    version: '1.0.0',
    createdAt: Date.now(),
    snapshots,
    metadata,
  }
  return JSON.stringify(exportData, null, 2)
}

export function importSnapshots(jsonString: string): Snapshot[] {
  try {
    const data: SnapshotExportFormat = JSON.parse(jsonString)
    if (!data.snapshots || !Array.isArray(data.snapshots)) {
      throw new Error('Invalid snapshot format')
    }
    return data.snapshots
  } catch (error) {
    console.error('Failed to import snapshots:', error)
    return []
  }
}

export function findObjectByUuid(scene: THREE.Scene, uuid: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  scene.traverse((obj) => {
    if (obj.uuid === uuid) {
      found = obj
    }
  })
  return found
}
