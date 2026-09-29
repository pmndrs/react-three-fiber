import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot, applyProps } from '../src/index'

/**
 * Some material props are compiled into the shader program, so three only picks up a change to one
 * after `material.needsUpdate = true` (#3892). Setting `needsUpdate` bumps `material.version`, which
 * is what the renderers compare, so the tests read the version.
 */

const makeTexture = () => new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1)

describe('material needsUpdate for program props', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  async function renderMaterial(props: Record<string, unknown>) {
    const ref = React.createRef<THREE.MeshStandardMaterial>()
    await act(async () => root.render(<meshStandardMaterial ref={ref} {...props} />))
    return ref
  }

  it.each([
    ['transparent', false, true],
    ['vertexColors', false, true],
    ['flatShading', false, true],
    ['fog', true, false],
  ])('sets needsUpdate when %s changes', async (prop, from, to) => {
    const ref = await renderMaterial({ [prop]: from })
    const version = ref.current!.version

    await act(async () => root.render(<meshStandardMaterial ref={ref} {...{ [prop]: to }} />))
    expect((ref.current as any)[prop]).toBe(to)
    expect(ref.current!.version).toBe(version + 1)

    // Removing the prop resets it to three's default, which changes it back
    await act(async () => root.render(<meshStandardMaterial ref={ref} />))
    expect((ref.current as any)[prop]).toBe(from)
    expect(ref.current!.version).toBe(version + 2)
  })

  it('sets needsUpdate when a texture slot gains or loses its texture', async () => {
    const texture = makeTexture()
    const ref = await renderMaterial({})
    const version = ref.current!.version

    await act(async () => root.render(<meshStandardMaterial ref={ref} normalMap={texture} />))
    expect(ref.current!.normalMap).toBe(texture)
    expect(ref.current!.version).toBe(version + 1)

    await act(async () => root.render(<meshStandardMaterial ref={ref} normalMap={null} />))
    expect(ref.current!.normalMap).toBe(null)
    expect(ref.current!.version).toBe(version + 2)
  })

  it('does not set needsUpdate when one texture is swapped for another', async () => {
    const ref = await renderMaterial({ map: makeTexture() })
    const version = ref.current!.version

    const next = makeTexture()
    await act(async () => root.render(<meshStandardMaterial ref={ref} map={next} />))
    expect(ref.current!.map).toBe(next)
    expect(ref.current!.version).toBe(version)
  })

  it('sets needsUpdate for an attached texture that mounts or unmounts', async () => {
    const ref = React.createRef<THREE.MeshStandardMaterial>()
    const Test = ({ show }: { show: boolean }) => (
      <meshStandardMaterial ref={ref}>{show && <dataTexture attach="map" args={[null, 1, 1]} />}</meshStandardMaterial>
    )

    await act(async () => root.render(<Test show={false} />))
    const version = ref.current!.version

    await act(async () => root.render(<Test show />))
    expect(ref.current!.map).toBeInstanceOf(THREE.DataTexture)
    expect(ref.current!.version).toBe(version + 1)

    await act(async () => root.render(<Test show={false} />))
    expect(ref.current!.map).toBe(null)
    expect(ref.current!.version).toBe(version + 2)
  })

  it('sets needsUpdate for a pierced program prop', async () => {
    const ref = React.createRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>()
    await act(async () => root.render(<mesh ref={ref} material-transparent={false} />))
    const version = ref.current!.material.version

    await act(async () => root.render(<mesh ref={ref} material-transparent />))
    expect(ref.current!.material.transparent).toBe(true)
    expect(ref.current!.material.version).toBe(version + 1)
  })

  it('does not set needsUpdate for uniform-backed props', async () => {
    const ref = await renderMaterial({ color: 'red', opacity: 1, roughness: 1 })
    const version = ref.current!.version

    await act(async () => root.render(<meshStandardMaterial ref={ref} color="blue" opacity={0.5} roughness={0.2} />))
    expect(ref.current!.opacity).toBe(0.5)
    expect(ref.current!.version).toBe(version)
  })

  it('does not set needsUpdate when a program prop is written with its current value', () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true })
    const version = material.version

    applyProps(material as any, { transparent: true, fog: material.fog })
    expect(material.version).toBe(version)
  })

  it('does not set needsUpdate on objects that are not materials', () => {
    const object = { isMaterial: undefined, transparent: false, version: 0, needsUpdate: false }

    applyProps(object as any, { transparent: true, map: makeTexture() })
    expect(object.needsUpdate).toBe(false)
  })
})
