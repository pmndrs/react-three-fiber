import * as THREE from 'three'
import * as React from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'

type RenderHudProps = {
  defaultScene: THREE.Scene
  defaultCamera: THREE.Camera
  renderPriority?: number
}

function RenderHud({ defaultScene, defaultCamera, renderPriority = 1 }: RenderHudProps) {
  const { renderer, scene, camera } = useThree()
  let oldClear: boolean

  // Register in 'render' phase to take over rendering from the default renderer
  // Priority within the phase controls order when multiple render jobs exist
  useFrame(
    () => {
      oldClear = renderer.autoClear

      if (renderPriority === 1) {
        // Clear scene and render the default scene first
        renderer.render(defaultScene, defaultCamera)
      }

      // Disable clearing and render the HUD portal with its own camera
      renderer.autoClear = false
      renderer.clearDepth()
      renderer.render(scene, camera)

      // Restore default
      renderer.autoClear = oldClear
    },
    { phase: 'render', priority: renderPriority },
  )
  // Without an element that receives pointer events state.pointer will always be 0/0
  return <group onPointerOver={() => null} />
}

export type HudProps = {
  /** Any React node */
  children: React.ReactNode
  /** Render priority, default: 1 */
  renderPriority?: number
}

export function Hud({ children, renderPriority = 1 }: HudProps) {
  const { scene: defaultScene, camera: defaultCamera } = useThree()
  const [hudScene] = React.useState(() => new THREE.Scene())
  return (
    <>
      {createPortal(
        <>
          {children}
          <RenderHud defaultScene={defaultScene} defaultCamera={defaultCamera} renderPriority={renderPriority} />
        </>,
        hudScene,
        { events: { priority: renderPriority + 1 } },
      )}
    </>
  )
}
