import * as THREE from 'three'
import { Instance, RootStore } from '../src'
import {
  is,
  dispose,
  REACT_INTERNAL_PROPS,
  getInstanceProps,
  prepare,
  resolve,
  attach,
  detach,
  RESERVED_PROPS,
  diffProps,
  applyProps,
  updateCamera,
} from '../src/core/utils'

// Mocks a Zustand store
const storeMock = Object.assign(() => null!, {
  getState: () => null!,
  setState() {},
  subscribe: () => () => {},
}) as unknown as RootStore

describe('is', () => {
  const myFunc = () => null
  const myObj = { myProp: 'test-prop' }
  const myStr = 'test-string'
  const myNum = 1
  const myUnd = undefined
  const myArr = [1, 2, 3]

  it('should tell me if something is a function', () => {
    expect(is.fun(myFunc)).toBe(true)

    expect(is.fun(myObj)).toBe(false)
    expect(is.fun(myStr)).toBe(false)
    expect(is.fun(myNum)).toBe(false)
    expect(is.fun(myUnd)).toBe(false)
    expect(is.fun(myArr)).toBe(false)
  })
  it('should tell me if something is an object', () => {
    expect(is.obj(myFunc)).toBe(false)

    expect(is.obj(myObj)).toBe(true)

    expect(is.obj(myStr)).toBe(false)
    expect(is.obj(myNum)).toBe(false)
    expect(is.obj(myUnd)).toBe(false)
    expect(is.obj(myArr)).toBe(false)
  })
  it('should tell me if something is a string', () => {
    expect(is.str(myFunc)).toBe(false)
    expect(is.str(myObj)).toBe(false)

    expect(is.str(myStr)).toBe(true)

    expect(is.str(myNum)).toBe(false)
    expect(is.str(myUnd)).toBe(false)
    expect(is.str(myArr)).toBe(false)
  })
  it('should tell me if something is a number', () => {
    expect(is.num(myFunc)).toBe(false)
    expect(is.num(myObj)).toBe(false)
    expect(is.num(myStr)).toBe(false)

    expect(is.num(myNum)).toBe(true)

    expect(is.num(myUnd)).toBe(false)
    expect(is.num(myArr)).toBe(false)
  })
  it('should tell me if something is undefined', () => {
    expect(is.und(myFunc)).toBe(false)
    expect(is.und(myObj)).toBe(false)
    expect(is.und(myStr)).toBe(false)
    expect(is.und(myNum)).toBe(false)

    expect(is.und(myUnd)).toBe(true)

    expect(is.und(myArr)).toBe(false)
  })
  it('should tell me if something is an array', () => {
    expect(is.arr(myFunc)).toBe(false)
    expect(is.arr(myObj)).toBe(false)
    expect(is.arr(myStr)).toBe(false)
    expect(is.arr(myNum)).toBe(false)
    expect(is.arr(myUnd)).toBe(false)

    expect(is.arr(myArr)).toBe(true)
  })
  it('should tell me if something is equal', () => {
    expect(is.equ([], '')).toBe(false)

    expect(is.equ('hello', 'hello')).toBe(true)
    expect(is.equ(1, 1)).toBe(true)

    const obj = { type: 'Mesh' }
    expect(is.equ(obj, obj)).toBe(true)
    expect(is.equ({}, {})).toBe(false)
    expect(is.equ({}, {}, { objects: 'reference' })).toBe(false)
    expect(is.equ({}, {}, { objects: 'shallow' })).toBe(true)
    expect(is.equ({ a: 1 }, { a: 1 })).toBe(false)
    expect(is.equ({ a: 1 }, { a: 1 }, { objects: 'reference' })).toBe(false)
    expect(is.equ({ a: 1 }, { a: 1 }, { objects: 'shallow' })).toBe(true)
    expect(is.equ({ a: 1, b: 1 }, { a: 1 }, { objects: 'shallow' })).toBe(false)
    expect(is.equ({ a: 1 }, { a: 1, b: 1 }, { objects: 'shallow' })).toBe(false)
    expect(is.equ({ a: 1 }, { a: 1, b: 1 }, { objects: 'shallow', strict: false })).toBe(true)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3] }, { arrays: 'reference', objects: 'reference' })).toBe(false)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3] }, { objects: 'reference' })).toBe(false)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3] }, { objects: 'shallow' })).toBe(true)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3, 4] }, { objects: 'shallow' })).toBe(false)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3, 4] }, { objects: 'shallow', strict: false })).toBe(true)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3], b: 1 }, { objects: 'shallow' })).toBe(false)
    expect(is.equ({ a: [1, 2, 3] }, { a: [1, 2, 3], b: 1 }, { objects: 'shallow', strict: false })).toBe(true)

    const arr = [1, 2, 3]
    expect(is.equ(arr, arr)).toBe(true)
    expect(is.equ([], [])).toBe(true)
    expect(is.equ([], [], { arrays: 'reference' })).toBe(false)
    expect(is.equ([], [], { arrays: 'shallow' })).toBe(true)
    expect(is.equ([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(is.equ([1, 2, 3], [1, 2, 3], { arrays: 'shallow' })).toBe(true)
    expect(is.equ([1, 2, 3], [1, 2, 3], { arrays: 'reference' })).toBe(false)
    expect(is.equ([1, 2], [1, 2, 3])).toBe(false)
    expect(is.equ([1, 2, 3, 4], [1, 2, 3])).toBe(false)
    expect(is.equ([1, 2], [1, 2, 3], { strict: false })).toBe(true)
  })
})

describe('dispose', () => {
  it('should dispose of objects and their properties', () => {
    const mesh = Object.assign(new THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>(), { dispose: jest.fn() })
    mesh.material.dispose = jest.fn()
    mesh.geometry.dispose = jest.fn()

    dispose(mesh)
    expect(mesh.dispose).toHaveBeenCalled()
    expect(mesh.material.dispose).toHaveBeenCalled()
    expect(mesh.geometry.dispose).toHaveBeenCalled()
  })

  it('should not dispose of a THREE.Scene', () => {
    const scene = Object.assign(new THREE.Scene(), { dispose: jest.fn() })

    dispose(scene)
    expect(scene.dispose).not.toHaveBeenCalled()

    const disposable = { dispose: jest.fn(), scene }
    dispose(disposable)
    expect(disposable.dispose).toHaveBeenCalled()
    expect(disposable.scene.dispose).not.toHaveBeenCalled()
  })
})

describe('getInstanceProps', () => {
  it('should filter internal props without accessing them', () => {
    const get = jest.fn()
    const set = jest.fn()

    const props = { foo: true }
    const filtered = getInstanceProps(
      REACT_INTERNAL_PROPS.reduce((acc, key) => ({ ...acc, [key]: { get, set } }), props),
    )

    expect(filtered).toStrictEqual(props)
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
})

describe('prepare', () => {
  it('should create an instance descriptor', () => {
    const object = new THREE.Object3D()
    const instance = prepare(object, storeMock, 'object3D', { name: 'object' })

    expect(instance.root).toBe(storeMock)
    expect(instance.type).toBe('object3D')
    expect(instance.props.name).toBe('object')
    expect(instance.object).toBe(object)
    expect((object as Instance<THREE.Object3D>['object']).__r3f).toBe(instance)
  })

  it('should not overwrite descriptors', () => {
    const containerDesc = {}
    const container = { __r3f: containerDesc }

    const instance = prepare(container, storeMock, 'container', {})
    expect(container.__r3f).toBe(containerDesc)
    expect(instance).toBe(containerDesc)
  })
})

describe('resolve', () => {
  it('should resolve pierced props', () => {
    const object = { foo: { bar: 1 } }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(object['foo'])
    expect(key).toBe('bar')
    expect(target).toBe(root[key])
  })

  it('should switch roots for atomic targets', () => {
    const bar = new THREE.Vector3()
    const object = { foo: { bar } }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(object)
    expect(key).toBe('bar')
    expect(target).toBe(bar)
  })
})

describe('attach / detach', () => {
  it('should attach & detach using string values', () => {
    const parent = prepare({ prop: null }, storeMock, '', {})
    const child = prepare({}, storeMock, '', { attach: 'prop' })

    attach(parent, child)
    expect(parent.object.prop).toBe(child.object)
    expect(child.previousAttach).toBe(null)

    detach(parent, child)
    expect(parent.object.prop).toBe(null)
    expect(child.previousAttach).toBe(undefined)
  })

  it('should attach & detach using attachFns', () => {
    const mount = jest.fn()
    const unmount = jest.fn()

    const parent = prepare({}, storeMock, '', {})
    const child = prepare({}, storeMock, '', { attach: () => (mount(), unmount) })

    attach(parent, child)
    expect(mount).toBeCalledTimes(1)
    expect(unmount).toBeCalledTimes(0)
    expect(child.previousAttach).toBe(unmount)

    detach(parent, child)
    expect(mount).toBeCalledTimes(1)
    expect(unmount).toBeCalledTimes(1)
    expect(child.previousAttach).toBe(undefined)
  })

  it('should create array when using array-index syntax', () => {
    const parent = prepare({ prop: null }, storeMock, '', {})
    const child = prepare({}, storeMock, '', { attach: 'prop-0' })

    attach(parent, child)
    expect(parent.object.prop).toStrictEqual([child.object])
    expect(child.previousAttach).toBe(undefined)

    detach(parent, child)
    expect((parent.object.prop as unknown as Array<never>).length).toBe(1)
    expect((parent.object.prop as unknown as Array<never>)[0]).toBe(undefined)
    expect(child.previousAttach).toBe(undefined)
  })
})

describe('diffProps', () => {
  it('should filter changed props', () => {
    const instance = prepare({}, storeMock, '', { foo: true })
    const newProps = { foo: true, bar: false }

    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual({ bar: false })
  })

  it('invalidates pierced props when root is changed', async () => {
    const texture1 = { needsUpdate: false, name: '' } as THREE.Texture
    const texture2 = { needsUpdate: false, name: '' } as THREE.Texture

    const oldProps = { map: texture1, 'map-needsUpdate': true, 'map-name': 'test' }
    const newProps = { map: texture2, 'map-needsUpdate': true, 'map-name': 'test' }

    const instance = prepare({}, storeMock, '', oldProps)
    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual(newProps)
  })

  it('should pick removed props for HMR', () => {
    const instance = prepare(new THREE.Object3D(), storeMock, '', { position: [0, 0, 1] })
    const newProps = {}

    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual({ position: new THREE.Object3D().position })
  })

  it('should reset removed props for HMR', () => {
    const instance = prepare(new THREE.Object3D(), storeMock, '', { scale: 10 })
    const filtered = diffProps(instance, {})
    expect((filtered.scale as THREE.Vector3).toArray()).toStrictEqual([1, 1, 1])
  })

  it('should filter reserved props without accessing them', () => {
    const get = jest.fn()
    const set = jest.fn()

    const props = { foo: true }
    const filtered = diffProps(
      prepare({}, storeMock, '', {}),
      RESERVED_PROPS.reduce((acc, key) => ({ ...acc, [key]: { get, set } }), props),
    )

    expect(filtered).toStrictEqual(props)
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
})

describe('applyProps', () => {
  it('should apply props to foreign objects', () => {
    const target = new THREE.Object3D()
    expect(() => applyProps(target, {})).not.toThrow()
  })

  it('should filter reserved props without accessing them', () => {
    const get = jest.fn()
    const set = jest.fn()

    const props = { foo: true }
    const target = {}
    applyProps(
      target,
      RESERVED_PROPS.reduce((acc, key) => ({ ...acc, [key]: { get, set } }), props),
    )

    expect(target).toStrictEqual(props)
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })

  it('should overwrite non-atomic properties', () => {
    const foo = { value: true }
    const target = { foo }
    applyProps(target, { foo: { value: false } })

    expect(target.foo).not.toBe(foo)
    expect(target.foo.value).toBe(false)
  })

  it('should prefer to copy from external props', async () => {
    const color = new THREE.Color()
    color.copy = jest.fn()

    const target = { color, layer: new THREE.Layers() }

    // Same constructor, copy
    applyProps(target, { color: new THREE.Color() })
    expect(target.color).toBeInstanceOf(THREE.Color)
    expect(color.copy).toHaveBeenCalledTimes(1)

    // Same constructor, Layers
    const layer = new THREE.Layers()
    layer.mask = 5
    applyProps(target, { layer })
    expect(target.layer).toBeInstanceOf(THREE.Layers)
    expect(target.layer.mask).toBe(layer.mask)

    // Different constructor, overwrite
    applyProps(target, { color: new THREE.Vector3() })
    expect(target.color).toBeInstanceOf(THREE.Vector3)
    expect(color.copy).toHaveBeenCalledTimes(1)
  })

  it('should prefer to set when props are an array', async () => {
    const target = new THREE.Object3D()
    applyProps(target, { position: [1, 2, 3] })

    expect(target.position.toArray()).toStrictEqual([1, 2, 3])
  })

  it('should set with scalar shorthand where applicable', async () => {
    // Vector3#setScalar
    const target = new THREE.Object3D()
    applyProps(target, { scale: 5 })
    expect(target.scale.toArray()).toStrictEqual([5, 5, 5])

    // Color#set
    const material = new THREE.MeshBasicMaterial()
    applyProps(material, { color: 0x000000 })
    expect(material.color.getHex()).toBe(0x000000)

    // No-op on undefined
    const mesh = new THREE.Mesh()
    applyProps(mesh, { position: undefined })
    expect(mesh.position.toArray()).toStrictEqual([0, 0, 0])
  })

  it('should pierce into nested properties', () => {
    const target = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>()
    applyProps(target, { 'material-color': 0x000000 })

    expect(target.material.color.getHex()).toBe(0x000000)
  })

  it('should not apply a prop if it is undefined', async () => {
    const target = { value: 'initial' }
    applyProps(target, { value: undefined })

    expect(target.value).toBe('initial')
  })
})

describe('updateCamera', () => {
  it('updates camera matrices', () => {
    const size = { width: 1280, height: 800, left: 0, top: 0 }

    const perspective = new THREE.PerspectiveCamera()
    perspective.updateProjectionMatrix = jest.fn()
    updateCamera(perspective, size)
    expect(perspective.updateProjectionMatrix).toHaveBeenCalled()
    expect(perspective.projectionMatrix.toArray()).toMatchSnapshot()

    const orthographic = new THREE.OrthographicCamera()
    orthographic.updateProjectionMatrix = jest.fn()
    updateCamera(orthographic, size)
    expect(orthographic.updateProjectionMatrix).toHaveBeenCalled()
    expect(orthographic.projectionMatrix.toArray()).toMatchSnapshot()
  })

  it('respects camera.manual', () => {
    const size = { width: 0, height: 0, left: 0, top: 0 }

    const perspective = Object.assign(new THREE.PerspectiveCamera(), { manual: true })
    perspective.updateProjectionMatrix = jest.fn()
    updateCamera(perspective, size)
    expect(perspective.updateProjectionMatrix).not.toHaveBeenCalled()

    const orthographic = Object.assign(new THREE.OrthographicCamera(), { manual: true })
    orthographic.updateProjectionMatrix = jest.fn()
    updateCamera(orthographic, size)
    expect(orthographic.updateProjectionMatrix).not.toHaveBeenCalled()
  })
})
