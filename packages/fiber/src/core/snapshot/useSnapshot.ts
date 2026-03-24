import * as THREE from 'three'
import * as React from 'react'
import { useThree } from '../hooks'
import {
  CameraSnapshot,
  ObjectSnapshot,
  MaterialSnapshot,
  GeometrySnapshot,
  MeshSnapshot,
  LightSnapshot,
  SceneSnapshot,
  Keyframe,
  SnapshotConfig,
  SnapshotOptions,
  RestoreOptions,
  UseSnapshotReturn,
  EasingFunctions,
} from './types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function captureCamera(camera: THREE.Camera): CameraSnapshot {
  const snapshot: CameraSnapshot = {
    type: camera.type as 'PerspectiveCamera' | 'OrthographicCamera',
    position: [camera.position.x, camera.position.y, camera.position.z],
    rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    quaternion: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
    up: [camera.up.x, camera.up.y, camera.up.z],
    near: (camera as THREE.PerspectiveCamera).near ?? 0.1,
    far: (camera as THREE.PerspectiveCamera).far ?? 2000,
  }

  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const perspective = camera as THREE.PerspectiveCamera
    snapshot.fov = perspective.fov
    snapshot.zoom = perspective.zoom
  }

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera
    snapshot.zoom = ortho.zoom
    snapshot.left = ortho.left
    snapshot.right = ortho.right
    snapshot.top = ortho.top
    snapshot.bottom = ortho.bottom
  }

  return snapshot
}

function restoreCamera(camera: THREE.Camera, snapshot: CameraSnapshot): void {
  camera.position.set(snapshot.position[0], snapshot.position[1], snapshot.position[2])
  camera.rotation.set(snapshot.rotation[0], snapshot.rotation[1], snapshot.rotation[2])
  camera.quaternion.set(snapshot.quaternion[0], snapshot.quaternion[1], snapshot.quaternion[2], snapshot.quaternion[3])
  camera.up.set(snapshot.up[0], snapshot.up[1], snapshot.up[2])

  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && snapshot.fov !== undefined) {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.near = snapshot.near
    perspective.far = snapshot.far
    perspective.fov = snapshot.fov
    if (snapshot.zoom !== undefined) perspective.zoom = snapshot.zoom
    perspective.updateProjectionMatrix()
  }

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera && snapshot.left !== undefined) {
    const ortho = camera as THREE.OrthographicCamera
    ortho.near = snapshot.near
    ortho.far = snapshot.far
    ortho.left = snapshot.left!
    ortho.right = snapshot.right!
    ortho.top = snapshot.top!
    ortho.bottom = snapshot.bottom!
    if (snapshot.zoom !== undefined) ortho.zoom = snapshot.zoom
    ortho.updateProjectionMatrix()
  }
}

function captureMaterial(material: THREE.Material): MaterialSnapshot {
  const snapshot: MaterialSnapshot = {
    uuid: material.uuid,
    type: material.type,
    name: material.name,
    visible: material.visible,
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side,
  }

  if ('color' in material && (material as THREE.MeshStandardMaterial).color) {
    snapshot.color = (material as THREE.MeshStandardMaterial).color.getHex()
  }

  if ('emissive' in material && (material as THREE.MeshStandardMaterial).emissive) {
    snapshot.emissive = (material as THREE.MeshStandardMaterial).emissive.getHex()
  }

  if ('roughness' in material) {
    snapshot.roughness = (material as THREE.MeshStandardMaterial).roughness
  }

  if ('metalness' in material) {
    snapshot.metalness = (material as THREE.MeshStandardMaterial).metalness
  }

  if ('map' in material) {
    snapshot.map = (material as THREE.MeshStandardMaterial).map?.uuid || null
  }

  if ('normalMap' in material) {
    snapshot.normalMap = (material as THREE.MeshStandardMaterial).normalMap?.uuid || null
  }

  return snapshot
}

function restoreMaterial(material: THREE.Material, snapshot: MaterialSnapshot): void {
  material.visible = snapshot.visible
  material.transparent = snapshot.transparent
  material.opacity = snapshot.opacity
  material.side = snapshot.side as THREE.Side

  if ('color' in material && snapshot.color !== undefined) {
    ;(material as THREE.MeshStandardMaterial).color.set(snapshot.color)
  }

  if ('emissive' in material && snapshot.emissive !== undefined) {
    ;(material as THREE.MeshStandardMaterial).emissive.set(snapshot.emissive)
  }

  if ('roughness' in material && snapshot.roughness !== undefined) {
    ;(material as THREE.MeshStandardMaterial).roughness = snapshot.roughness
  }

  if ('metalness' in material && snapshot.metalness !== undefined) {
    ;(material as THREE.MeshStandardMaterial).metalness = snapshot.metalness
  }

  material.needsUpdate = true
}

function captureGeometry(geometry: THREE.BufferGeometry): GeometrySnapshot {
  const snapshot: GeometrySnapshot = {
    uuid: geometry.uuid,
    type: geometry.type,
    name: geometry.name,
  }

  const positionAttr = geometry.getAttribute('position')
  if (positionAttr) {
    snapshot.position = new Float32Array(positionAttr.array as Float32Array)
  }

  const normalAttr = geometry.getAttribute('normal')
  if (normalAttr) {
    snapshot.normal = new Float32Array(normalAttr.array as Float32Array)
  }

  const uvAttr = geometry.getAttribute('uv')
  if (uvAttr) {
    snapshot.uv = new Float32Array(uvAttr.array as Float32Array)
  }

  if (geometry.index) {
    snapshot.index = new Uint32Array(geometry.index.array as Uint32Array)
  }

  return snapshot
}

function captureObject(
  object: THREE.Object3D,
  options: SnapshotOptions,
  depth: number = 0,
): ObjectSnapshot | null {
  if (options.filter && !options.filter(object)) {
    return null
  }

  if (options.depthLimit !== undefined && depth > options.depthLimit) {
    return null
  }

  let snapshot: ObjectSnapshot = {
    uuid: object.uuid,
    name: object.name,
    type: object.type,
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    quaternion: [object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w],
    scale: [object.scale.x, object.scale.y, object.scale.z],
    visible: object.visible,
    castShadow: object.castShadow,
    receiveShadow: object.receiveShadow,
    userData: options.includeUserData !== false ? JSON.parse(JSON.stringify(object.userData)) : {},
  }

  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh
    const meshSnapshot: MeshSnapshot = {
      ...snapshot,
      geometry: options.includeGeometry !== false && mesh.geometry ? captureGeometry(mesh.geometry) : undefined,
      material: undefined,
    }

    if (options.includeMaterials !== false && mesh.material) {
      if (Array.isArray(mesh.material)) {
        meshSnapshot.material = mesh.material.map((m) => captureMaterial(m))
      } else {
        meshSnapshot.material = captureMaterial(mesh.material)
      }
    }

    snapshot = meshSnapshot
  }

  if ((object as THREE.Light).isLight) {
    const light = object as THREE.Light
    const lightSnapshot: LightSnapshot = {
      ...snapshot,
      color: light.color.getHex(),
      intensity: light.intensity,
    }

    if ((light as THREE.SpotLight).isSpotLight || (light as THREE.DirectionalLight).isDirectionalLight) {
      lightSnapshot.castShadow = (light as THREE.SpotLight).castShadow
      if ((light as THREE.SpotLight).shadow) {
        lightSnapshot.shadow = {
          mapSize: [
            (light as THREE.SpotLight).shadow.mapSize.x,
            (light as THREE.SpotLight).shadow.mapSize.y,
          ],
          bias: (light as THREE.SpotLight).shadow.bias,
          radius: (light as THREE.SpotLight).shadow.radius,
        }
      }
    }

    snapshot = lightSnapshot
  }

  if (options.includeChildren !== false && object.children.length > 0) {
    snapshot.children = object.children
      .map((child) => captureObject(child, options, depth + 1))
      .filter((child): child is ObjectSnapshot => child !== null)
  }

  return snapshot
}

function restoreObject(
  object: THREE.Object3D,
  snapshot: ObjectSnapshot,
  options: RestoreOptions,
): void {
  if (options.restoreObjects !== false) {
    object.position.set(snapshot.position[0], snapshot.position[1], snapshot.position[2])
    object.rotation.set(snapshot.rotation[0], snapshot.rotation[1], snapshot.rotation[2])
    object.quaternion.set(snapshot.quaternion[0], snapshot.quaternion[1], snapshot.quaternion[2], snapshot.quaternion[3])
    object.scale.set(snapshot.scale[0], snapshot.scale[1], snapshot.scale[2])
    object.visible = snapshot.visible
    if (snapshot.castShadow !== undefined) object.castShadow = snapshot.castShadow
    if (snapshot.receiveShadow !== undefined) object.receiveShadow = snapshot.receiveShadow
  }

  if (options.restoreUserData !== false) {
    object.userData = { ...object.userData, ...snapshot.userData }
  }

  if ((object as THREE.Mesh).isMesh && (snapshot as MeshSnapshot).material) {
    const mesh = object as THREE.Mesh
    const meshSnapshot = snapshot as MeshSnapshot

    if (options.restoreMaterials !== false && meshSnapshot.material) {
      if (Array.isArray(mesh.material) && Array.isArray(meshSnapshot.material)) {
        const materials = meshSnapshot.material as MaterialSnapshot[]
        mesh.material.forEach((mat, i) => {
          if (materials[i]) {
            restoreMaterial(mat, materials[i])
          }
        })
      } else if (!Array.isArray(mesh.material) && !Array.isArray(meshSnapshot.material)) {
        restoreMaterial(mesh.material, meshSnapshot.material)
      }
    }
  }

  if ((object as THREE.Light).isLight) {
    const light = object as THREE.Light
    const lightSnapshot = snapshot as LightSnapshot
    light.color.set(lightSnapshot.color)
    light.intensity = lightSnapshot.intensity
  }

  if (snapshot.children) {
    snapshot.children.forEach((childSnapshot: ObjectSnapshot) => {
      const child = object.getObjectByProperty('uuid', childSnapshot.uuid)
      if (child) {
        restoreObject(child, childSnapshot, options)
      }
    })
  }
}

function captureScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: SnapshotOptions = {},
): SceneSnapshot {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    camera: captureCamera(camera),
    scene: captureObject(scene, options) as ObjectSnapshot,
    fog: scene.fog
      ? {
          type: scene.fog instanceof THREE.FogExp2 ? 'FogExp2' : 'Fog',
          color: scene.fog.color.getHex(),
          ...(scene.fog instanceof THREE.Fog
            ? { near: scene.fog.near, far: scene.fog.far }
            : { density: (scene.fog as THREE.FogExp2).density }),
        }
      : null,
  }
}

function interpolateSnapshots(
  from: SceneSnapshot,
  to: SceneSnapshot,
  progress: number,
  easing: Keyframe['easing'] = 'linear',
): SceneSnapshot {
  const easedProgress = EasingFunctions[easing](progress)

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  function lerpArray(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
  }

  function lerpQuaternion(
    a: [number, number, number, number],
    b: [number, number, number, number],
    t: number,
  ): [number, number, number, number] {
    const qa = new THREE.Quaternion(a[0], a[1], a[2], a[3])
    const qb = new THREE.Quaternion(b[0], b[1], b[2], b[3])
    qa.slerp(qb, t)
    return [qa.x, qa.y, qa.z, qa.w]
  }

  const interpolatedCamera: CameraSnapshot = {
    type: to.camera.type,
    position: lerpArray(from.camera.position, to.camera.position, easedProgress),
    rotation: lerpArray(from.camera.rotation, to.camera.rotation, easedProgress),
    quaternion: lerpQuaternion(from.camera.quaternion, to.camera.quaternion, easedProgress),
    up: lerpArray(from.camera.up, to.camera.up, easedProgress),
    near: lerp(from.camera.near, to.camera.near, easedProgress),
    far: lerp(from.camera.far, to.camera.far, easedProgress),
    fov: to.camera.fov !== undefined ? lerp(from.camera.fov || 75, to.camera.fov, easedProgress) : undefined,
    zoom: to.camera.zoom !== undefined ? lerp(from.camera.zoom || 1, to.camera.zoom, easedProgress) : undefined,
    left: to.camera.left,
    right: to.camera.right,
    top: to.camera.top,
    bottom: to.camera.bottom,
  }

  function interpolateObjects(
    fromObj: ObjectSnapshot,
    toObj: ObjectSnapshot,
    t: number,
  ): ObjectSnapshot {
    const result: ObjectSnapshot = {
      uuid: toObj.uuid,
      name: toObj.name,
      type: toObj.type,
      position: lerpArray(fromObj.position, toObj.position, t),
      rotation: lerpArray(fromObj.rotation, toObj.rotation, t),
      quaternion: lerpQuaternion(fromObj.quaternion, toObj.quaternion, t),
      scale: lerpArray(fromObj.scale, toObj.scale, t),
      visible: t > 0.5 ? toObj.visible : fromObj.visible,
      castShadow: toObj.castShadow,
      receiveShadow: toObj.receiveShadow,
      userData: toObj.userData,
    }

    if (toObj.children && fromObj.children) {
      result.children = toObj.children.map((toChild: ObjectSnapshot) => {
        const fromChild = fromObj.children?.find((c: ObjectSnapshot) => c.uuid === toChild.uuid)
        if (fromChild) {
          return interpolateObjects(fromChild, toChild, t)
        }
        return toChild
      })
    }

    return result
  }

  return {
    version: '1.0.0',
    timestamp: Date.now(),
    camera: interpolatedCamera,
    scene: interpolateObjects(from.scene, to.scene, easedProgress),
    fog: to.fog,
  }
}

export function useSnapshot(): UseSnapshotReturn {
  const { scene, camera } = useThree()
  const snapshotsRef = React.useRef<Map<string, SceneSnapshot>>(new Map())
  const currentSnapshotIdRef = React.useRef<string | null>(null)
  const isRecordingRef = React.useRef<boolean>(false)
  const recordingStartTimeRef = React.useRef<number | null>(null)
  const recordedKeyframesRef = React.useRef<Keyframe[]>([])

  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)

  const capture = React.useCallback(
    (name?: string, options: SnapshotOptions = {}): string => {
      const id = generateId()
      const snapshot = captureScene(scene, camera, options)
      if (name) {
        snapshot.name = name
      }
      snapshotsRef.current.set(id, snapshot)
      currentSnapshotIdRef.current = id
      forceUpdate()
      return id
    },
    [scene, camera],
  )

  const restore = React.useCallback(
    (id: string, options: RestoreOptions = {}): void => {
      const snapshot = snapshotsRef.current.get(id)
      if (!snapshot) {
        console.warn(`Snapshot with id "${id}" not found`)
        return
      }

      if (options.restoreCamera !== false) {
        restoreCamera(camera, snapshot.camera)
      }

      if (options.restoreObjects !== false) {
        restoreObject(scene, snapshot.scene, options)
      }

      currentSnapshotIdRef.current = id
      forceUpdate()
    },
    [scene, camera],
  )

  const deleteSnapshot = React.useCallback((id: string): void => {
    snapshotsRef.current.delete(id)
    if (currentSnapshotIdRef.current === id) {
      currentSnapshotIdRef.current = null
    }
    forceUpdate()
  }, [])

  const clear = React.useCallback((): void => {
    snapshotsRef.current.clear()
    currentSnapshotIdRef.current = null
    forceUpdate()
  }, [])

  const startRecording = React.useCallback((): void => {
    isRecordingRef.current = true
    recordingStartTimeRef.current = Date.now()
    recordedKeyframesRef.current = []
    forceUpdate()
  }, [])

  const stopRecording = React.useCallback((): Keyframe[] => {
    isRecordingRef.current = false
    recordingStartTimeRef.current = null
    forceUpdate()
    return recordedKeyframesRef.current
  }, [])

  const addKeyframe = React.useCallback(
    (label?: string): Keyframe => {
      const snapshot = captureScene(scene, camera)
      const time = recordingStartTimeRef.current ? Date.now() - recordingStartTimeRef.current : 0
      const keyframe: Keyframe = {
        id: generateId(),
        time,
        snapshot,
        easing: 'linear',
        label,
      }
      recordedKeyframesRef.current.push(keyframe)
      return keyframe
    },
    [scene, camera],
  )

  const exportConfig = React.useCallback((): SnapshotConfig => {
    const snapshots = Array.from(snapshotsRef.current.entries()).map(([id, snapshot]) => ({
      id,
      ...snapshot,
    })) as SceneSnapshot[]

    return {
      version: '1.0.0',
      name: 'Snapshot Configuration',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshots,
      animations: [
        {
          id: generateId(),
          name: 'Recorded Animation',
          keyframes: recordedKeyframesRef.current,
          duration: recordedKeyframesRef.current.length > 0
            ? Math.max(...recordedKeyframesRef.current.map((k) => k.time))
            : 0,
          loop: false,
          loopCount: 1,
        },
      ],
    }
  }, [])

  const importConfig = React.useCallback((config: SnapshotConfig): void => {
    snapshotsRef.current.clear()
    config.snapshots.forEach((snapshot: SceneSnapshot) => {
      const id = (snapshot as SceneSnapshot & { id?: string }).id || generateId()
      snapshotsRef.current.set(id, snapshot)
    })

    if (config.animations.length > 0) {
      recordedKeyframesRef.current = config.animations[0].keyframes
    }

    forceUpdate()
  }, [])

  const getSnapshotById = React.useCallback((id: string): SceneSnapshot | undefined => {
    return snapshotsRef.current.get(id)
  }, [])

  const getSnapshotByName = React.useCallback((name: string): SceneSnapshot | undefined => {
    for (const snapshot of snapshotsRef.current.values()) {
      if (snapshot.name === name) {
        return snapshot
      }
    }
    return undefined
  }, [])

  const listSnapshots = React.useCallback((): { id: string; name?: string; timestamp: number }[] => {
    return Array.from(snapshotsRef.current.entries()).map(([id, snapshot]) => ({
      id,
      name: snapshot.name,
      timestamp: snapshot.timestamp,
    }))
  }, [])

  const currentSnapshot = currentSnapshotIdRef.current
    ? snapshotsRef.current.get(currentSnapshotIdRef.current) || null
    : null

  return {
    snapshots: snapshotsRef.current,
    currentSnapshot,
    isRecording: isRecordingRef.current,
    capture,
    restore,
    delete: deleteSnapshot,
    clear,
    startRecording,
    stopRecording,
    addKeyframe,
    exportConfig,
    importConfig,
    getSnapshotById,
    getSnapshotByName,
    listSnapshots,
  }
}

export { captureScene, restoreCamera, restoreObject, interpolateSnapshots }
export type { SceneSnapshot, Keyframe, SnapshotConfig, SnapshotOptions, RestoreOptions, UseSnapshotReturn }
