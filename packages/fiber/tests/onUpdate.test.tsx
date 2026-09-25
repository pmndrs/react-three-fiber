import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { vi } from 'vitest'
import { ReconcilerRoot, createRoot, extend } from '../src/index'
import { notifyDepreciated } from '../src/core/utils/notices'

// The real notifyDepreciated de-duplicates per session by heading, which would make every test
// after the first unable to observe the notice. Record calls instead.
vi.mock('../src/core/utils/notices', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/utils/notices')>()
  return { ...actual, notifyDepreciated: vi.fn() }
})

extend(THREE)

/**
 * `onUpdate` was an R3F hook until v10 (#3903). It is now an ordinary prop: applied to the object by
 * name, never invoked by the reconciler. That matters for `<texture>`, whose `onUpdate` is a real
 * three.js callback fired by the renderer after a GPU upload (not after prop changes), and for TSL
 * nodes, where it replaces the `Node.onUpdate()` method. Every use logs a notice pointing at the
 * migration guide, since all three cases change behavior silently.
 */
describe('onUpdate removal', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!
  const notices = () =>
    vi.mocked(notifyDepreciated).mock.calls.filter(([n]) => n.heading === 'onUpdate is no longer an R3F prop')

  beforeEach(() => {
    vi.mocked(notifyDepreciated).mockClear()
    root = createRoot(document.createElement('canvas'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it("passes onUpdate through to three's Texture.onUpdate and still logs the notice", async () => {
    const textureRef = React.createRef<THREE.DataTexture>()
    const onUpdate = vi.fn()

    await act(async () =>
      root.render(
        <mesh>
          <boxGeometry />
          <meshBasicMaterial>
            {/* DataTexture: single all-optional constructor, so `args` is optional (plain
                `<texture>` resolves to Texture's deprecated 9-argument overload, see the
                ConstructorParameters note in types/reconciler.d.ts) */}
            <dataTexture attach="map" ref={textureRef} onUpdate={onUpdate} />
          </meshBasicMaterial>
        </mesh>,
      ),
    )

    const texture = textureRef.current!
    expect(texture.onUpdate).toBe(onUpdate)
    // R3F never calls it; three's renderer does, after uploading the texture.
    expect(onUpdate).not.toHaveBeenCalled()
    texture.onUpdate!(texture)
    expect(onUpdate).toHaveBeenCalledWith(texture)

    // The semantics changed (upload callback, not a prop-update hook), so a v9
    // `onUpdate={(self) => (self.needsUpdate = true)}` would silently stop flagging uploads.
    expect(notices()).toHaveLength(1)
    expect(notices()[0][0].body).toMatch(/Texture\.onUpdate/)
  })

  it('no longer calls onUpdate on prop changes and warns for objects without the property', async () => {
    const meshRef = React.createRef<THREE.Mesh>()
    const onUpdate = vi.fn()

    function Test({ z }: { z: number }) {
      return (
        <>
          {/* @ts-expect-error onUpdate is not a Mesh property, so it is no longer a typed prop */}
          <mesh ref={meshRef} position={[0, 0, z]} onUpdate={onUpdate} />
          {/* @ts-expect-error same, on a second object */}
          <group onUpdate={onUpdate} />
        </>
      )
    }

    await act(async () => root.render(<Test z={0} />))
    await act(async () => root.render(<Test z={1} />))
    await act(async () => root.render(<Test z={2} />))

    expect(meshRef.current!.position.z).toBe(2)
    expect(onUpdate).not.toHaveBeenCalled()
    // Applied by name like any other prop
    expect((meshRef.current as any).onUpdate).toBe(onUpdate)

    // Once per object on mount; the stable callback is not re-applied (diffProps skips equal props)
    expect(notices()).toHaveLength(2)
    expect(notices()[0][0].link).toMatch(/migration\/v10#onupdate-removed/)
  })

  it('logs the notice once per session', async () => {
    const { notifyDepreciated: real } =
      await vi.importActual<typeof import('../src/core/utils/notices')>('../src/core/utils/notices')
    vi.mocked(notifyDepreciated).mockImplementation(real)
    const original = process.env.R3F_SHOW_DEPRECATION_WARNINGS
    process.env.R3F_SHOW_DEPRECATION_WARNINGS = 'true'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      // @ts-expect-error onUpdate is not a Group property
      await act(async () => root.render(<group onUpdate={() => {}} />))
      // @ts-expect-error same
      await act(async () => root.render(<group onUpdate={() => {}} />))
      const printed = warn.mock.calls.filter(([msg]) => typeof msg === 'string' && /onUpdate/.test(msg))
      expect(printed).toHaveLength(1)
      expect(printed[0][0]).toMatch(/migration\/v10#onupdate-removed/)
    } finally {
      vi.mocked(notifyDepreciated).mockReset()
      warn.mockRestore()
      log.mockRestore()
      if (original === undefined) delete process.env.R3F_SHOW_DEPRECATION_WARNINGS
      else process.env.R3F_SHOW_DEPRECATION_WARNINGS = original
    }
  })

  it('is replaced by a ref callback for mount and an effect keyed on the props that change', async () => {
    const onMount = vi.fn()
    const onSize = vi.fn()

    function Box({ size }: { size: number }) {
      const ref = React.useRef<THREE.Mesh>(null)
      React.useEffect(() => {
        ref.current!.scale.setScalar(size)
        onSize(ref.current, size)
      }, [size])
      // Stable identity: an inline callback is a new function each render and React would
      // re-invoke it (null, then the object) on every render.
      const refCallback = React.useCallback((mesh: THREE.Mesh | null) => {
        ref.current = mesh
        if (mesh) onMount(mesh)
      }, [])
      return <mesh ref={refCallback} />
    }

    await act(async () => root.render(<Box size={1} />))
    const mesh = onMount.mock.calls[0][0] as THREE.Mesh
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onSize).toHaveBeenCalledTimes(1)
    expect(onSize).toHaveBeenLastCalledWith(mesh, 1)

    // A re-render with the same size neither remounts nor re-runs the effect
    await act(async () => root.render(<Box size={1} />))
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onSize).toHaveBeenCalledTimes(1)

    // Only the prop the effect is keyed on triggers it
    await act(async () => root.render(<Box size={3} />))
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onSize).toHaveBeenCalledTimes(2)
    expect(onSize).toHaveBeenLastCalledWith(mesh, 3)
    expect(mesh.scale.x).toBe(3)
  })
})
