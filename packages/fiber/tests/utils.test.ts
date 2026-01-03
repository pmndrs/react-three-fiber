import * as THREE from 'three'
import { act } from 'react'
import { RootStore, Instance, createRoot } from '../src'
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
  findInitialRoot,
} from '../src/core/utils'

function createMockStore(): RootStore {
  let store!: RootStore
  try {
    act(async () => (store = createRoot(document.createElement('canvas')).render(null))).then(() => null)
  } catch (e) {
    console.error(e)
  }
  return store
}

const store = createMockStore()

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
    const mesh = Object.assign(new THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>(), { dispose: vi.fn() })
    mesh.material.dispose = vi.fn()
    mesh.geometry.dispose = vi.fn()

    dispose(mesh)
    expect(mesh.dispose).toHaveBeenCalled()
    expect(mesh.material.dispose).toHaveBeenCalled()
    expect(mesh.geometry.dispose).toHaveBeenCalled()
  })

  it('should not dispose of a THREE.Scene', () => {
    const scene = Object.assign(new THREE.Scene(), { dispose: vi.fn() })

    dispose(scene)
    expect(scene.dispose).not.toHaveBeenCalled()

    const disposable = { dispose: vi.fn(), scene }
    dispose(disposable)
    expect(disposable.dispose).toHaveBeenCalled()
    expect(disposable.scene.dispose).not.toHaveBeenCalled()
  })
})

describe('getInstanceProps', () => {
  it('should filter internal props without accessing them', () => {
    const get = vi.fn()
    const set = vi.fn()

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
    const instance = prepare(object, store, 'object3D', { name: 'object' })

    expect(instance.root).toBe(store)
    expect(instance.type).toBe('object3D')
    expect(instance.props.name).toBe('object')
    expect(instance.object).toBe(object)
    expect((object as Instance<THREE.Object3D>['object']).__r3f).toBe(instance)
  })

  it('should not overwrite descriptors', () => {
    const containerDesc = {}
    const container = { __r3f: containerDesc }

    const instance = prepare(container, store, 'container', {})
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

  it('should prioritize direct property over piercing', () => {
    const object = {
      'foo-bar': 'direct',
      foo: { bar: 'pierced' },
    }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(object)
    expect(key).toBe('foo-bar')
    expect(target).toBe('direct')
  })

  it('should handle undefined direct property values', () => {
    const object = { 'foo-bar': undefined }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(object)
    expect(key).toBe('foo-bar')
    expect(target).toBe(undefined)
  })

  it('should handle null direct property values', () => {
    const object = { 'foo-bar': null }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(object)
    expect(key).toBe('foo-bar')
    expect(target).toBe(null)
  })

  it('should return non-object as root when piercing fails due to non-object intermediate', () => {
    const object = { foo: 'not-an-object' }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe('not-an-object')
    expect(key).toBe('bar')
    expect(target).toBe(undefined)
  })

  it('should return null as root when piercing fails due to null intermediate', () => {
    const object = { foo: null }
    const { root, key, target } = resolve(object, 'foo-bar')

    expect(root).toBe(null)
    expect(key).toBe('bar')
    expect(target).toBe(undefined)
  })

  it('should handle non-dashed keys normally', () => {
    const object = { foo: 'value' }
    const { root, key, target } = resolve(object, 'foo')

    expect(root).toBe(object)
    expect(key).toBe('foo')
    expect(target).toBe('value')
  })
})

describe('attach / detach', () => {
  it('should attach & detach using string values', () => {
    const parent = prepare({ prop: null }, store, '', {})
    const child = prepare({}, store, '', { attach: 'prop' })

    attach(parent, child)
    expect(parent.object.prop).toBe(child.object)
    expect(child.previousAttach).toBe(null)

    detach(parent, child)
    expect(parent.object.prop).toBe(null)
    expect(child.previousAttach).toBe(undefined)
  })

  it('should attach & detach using attachFns', () => {
    const mount = vi.fn()
    const unmount = vi.fn()

    const parent = prepare({}, store, '', {})
    const child = prepare({}, store, '', { attach: () => (mount(), unmount) })

    attach(parent, child)
    expect(mount).toHaveBeenCalledTimes(1)
    expect(unmount).toHaveBeenCalledTimes(0)
    expect(child.previousAttach).toBe(unmount)

    detach(parent, child)
    expect(mount).toHaveBeenCalledTimes(1)
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(child.previousAttach).toBe(undefined)
  })

  it('should create array when using array-index syntax', () => {
    const parent = prepare({ prop: null }, store, '', {})
    const child = prepare({}, store, '', { attach: 'prop-0' })

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
    const instance = prepare({}, store, '', { foo: true })
    const newProps = { foo: true, bar: false }

    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual({ bar: false })
  })

  it('invalidates pierced props when root is changed', () => {
    const texture1 = { needsUpdate: false, name: '' } as THREE.Texture
    const texture2 = { needsUpdate: false, name: '' } as THREE.Texture

    const oldProps = { map: texture1, 'map-needsUpdate': true, 'map-name': 'test' }
    const newProps = { map: texture2, 'map-needsUpdate': true, 'map-name': 'test' }

    const instance = prepare({}, store, '', oldProps)
    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual(newProps)
  })

  it('should pick removed props for HMR', () => {
    const instance = prepare(new THREE.Object3D(), store, '', { position: [0, 0, 1] })
    const newProps = {}

    const filtered = diffProps(instance, newProps)
    expect(filtered).toStrictEqual({ position: new THREE.Object3D().position })
  })

  it('should reset removed props for HMR', () => {
    const instance = prepare(new THREE.Object3D(), store, '', { scale: 10 })
    const filtered = diffProps(instance, {})
    expect((filtered.scale as THREE.Vector3).toArray()).toStrictEqual([1, 1, 1])
  })

  it('should filter reserved props without accessing them', () => {
    const get = vi.fn()
    const set = vi.fn()

    const props = { foo: true }
    const filtered = diffProps(
      prepare({}, store, '', {}),
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

  it('should not throw when applying unknown props', () => {
    const target = new THREE.Object3D()
    applyProps(target, {})
    expect(() => applyProps(target, { ['foo-bar']: 1 })).not.toThrow()
    // NOTE: Changed behavior - unknown props are now applied directly to the object
    // Previously they were silently ignored. If this causes issues, may need to revert
    // to filtering unknown props instead of applying them.
    expect((target as any)['foo-bar']).toBe(1)
  })

  it('should throw when applying unknown props due to non-object intermediate', () => {
    const target = new THREE.Object3D()
    applyProps(target, { foo: 1 })
    expect(() => applyProps(target, { ['foo-bar']: 1 })).toThrow()
  })

  it('should filter reserved props without accessing them', () => {
    const get = vi.fn()
    const set = vi.fn()

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

  it('should prefer to copy potentially read-only math classes', () => {
    const one = new THREE.Vector3(1, 1, 1)
    const two = new THREE.Vector3(2, 2, 2)

    const target = { test: one }
    applyProps(target, { test: two })

    expect(target.test).toBe(one)
    expect(target.test.toArray()).toStrictEqual([2, 2, 2])
  })

  it('should not copy if props are supersets of another', () => {
    const copy = vi.fn()
    const set = vi.fn()

    class Test {
      copy = copy
      set = set
    }
    class SuperTest extends Test {
      copy = copy
      set = set
    }

    const one = new Test()
    const two = new SuperTest()

    const target = { test: one }
    applyProps(target, { test: two })

    expect(one.copy).not.toHaveBeenCalled()
    expect(two.copy).not.toHaveBeenCalled()
    expect(one.set).not.toHaveBeenCalled()
    expect(two.set).not.toHaveBeenCalled()
    expect(target.test).toBe(two)
  })

  it('should prefer to set when props are an array', () => {
    const target = new THREE.Object3D()
    applyProps(target, { position: [1, 2, 3] })

    expect(target.position.toArray()).toStrictEqual([1, 2, 3])
  })

  it('should set with scalar shorthand where applicable', () => {
    // Vector3#setScalar
    const target = new THREE.Object3D()
    applyProps(target, { scale: 5 })
    expect(target.scale.toArray()).toStrictEqual([5, 5, 5])

    // Color#set
    const material = new THREE.MeshBasicMaterial()
    applyProps(material, { color: 0x000000 })
    expect(material.color.getHex()).toBe(0x000000)
    applyProps(material, { color: 'white' })
    expect(material.color.getHex()).toBe(0xffffff)
    applyProps(material, { color: new THREE.Color('red') })
    expect(material.color.getHex()).toBe(0xff0000)

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

  it('should not apply a prop if it is undefined', () => {
    const target = { value: 'initial' }
    applyProps(target, { value: undefined })

    expect(target.value).toBe('initial')
  })

  it('should not apply a prop to an instance if it is a reserved event', () => {
    const target = prepare(new THREE.Object3D(), store, '', {})
    applyProps(target.object, { onClick: () => null })

    expect('onClick' in target).toBe(false)
  })

  // https://github.com/pmndrs/koota/issues/47
  it('should not fallthrough to set/copy for primitive types', () => {
    const set = vi.fn()
    const copy = vi.fn()

    // @ts-ignore
    Number.prototype.set = set
    // @ts-ignore
    Number.prototype.copy = copy

    const target = { scale: 1, rotation: new THREE.Vector3(1, 2, 3) }
    applyProps(target, { scale: 10, 'rotation-z': 4 })

    // @ts-ignore
    delete Number.prototype.set
    // @ts-ignore
    delete Number.prototype.copy

    expect(set).not.toHaveBeenCalled()
    expect(copy).not.toHaveBeenCalled()
    expect(target.scale).toBe(10)
    expect(target.rotation.z).toBe(4)
  })

  it('should create intermediate instance when target is null and value is vector-like', () => {
    // Create an object with null color property (simulating custom material scenario)
    const material: any = { color: null }
    const colorRed = new THREE.Color('red')
    const colorWhite = new THREE.Color('white')

    // First application: target is null, should create intermediate instance
    applyProps(material, { color: colorRed })

    // Material should have a color instance now (not null)
    expect(material.color).not.toBeNull()
    expect(material.color).not.toBe(colorRed)
    expect(material.color.getHex()).toBe(0xff0000)

    // Store reference to the created intermediate instance
    const intermediateColor = material.color

    // Second application: should copy into the intermediate, not replace it
    applyProps(material, { color: colorWhite })

    // Material color should still be the same instance (intermediate)
    expect(material.color).toBe(intermediateColor)
    expect(material.color.getHex()).toBe(0xffffff)

    // Original color objects should not be mutated
    expect(colorRed.getHex()).toBe(0xff0000)
    expect(colorWhite.getHex()).toBe(0xffffff)

    // Third application: back to red - intermediate should update again
    applyProps(material, { color: colorRed })
    expect(material.color).toBe(intermediateColor)
    expect(material.color.getHex()).toBe(0xff0000)
  })

  it('should create intermediate instance for vectors when target is null', () => {
    const target = { position: null as THREE.Vector3 | null }
    const vec1 = new THREE.Vector3(1, 2, 3)
    const vec2 = new THREE.Vector3(4, 5, 6)

    // First apply
    applyProps(target, { position: vec1 })
    expect(target.position).not.toBeNull()
    expect(target.position).not.toBe(vec1)
    expect(target.position?.toArray()).toStrictEqual([1, 2, 3])

    const intermediate = target.position

    // Second apply - should mutate intermediate, not replace
    applyProps(target, { position: vec2 })
    expect(target.position).toBe(intermediate)
    expect(target.position?.toArray()).toStrictEqual([4, 5, 6])

    // Original vectors should not be mutated
    expect(vec1.toArray()).toStrictEqual([1, 2, 3])
    expect(vec2.toArray()).toStrictEqual([4, 5, 6])
  })
})

describe('updateCamera', () => {
  it('updates camera matrices', () => {
    const size = { width: 1280, height: 800, left: 0, top: 0 }

    const perspective = new THREE.PerspectiveCamera()
    perspective.updateProjectionMatrix = vi.fn()
    updateCamera(perspective, size)
    expect(perspective.updateProjectionMatrix).toHaveBeenCalled()
    expect(perspective.projectionMatrix.toArray()).toMatchSnapshot()

    const orthographic = new THREE.OrthographicCamera()
    orthographic.updateProjectionMatrix = vi.fn()
    updateCamera(orthographic, size)
    expect(orthographic.updateProjectionMatrix).toHaveBeenCalled()
    expect(orthographic.projectionMatrix.toArray()).toMatchSnapshot()
  })

  it('respects camera.manual', () => {
    const size = { width: 0, height: 0, left: 0, top: 0 }

    const perspective = Object.assign(new THREE.PerspectiveCamera(), { manual: true })
    perspective.updateProjectionMatrix = vi.fn()
    updateCamera(perspective, size)
    expect(perspective.updateProjectionMatrix).not.toHaveBeenCalled()

    const orthographic = Object.assign(new THREE.OrthographicCamera(), { manual: true })
    orthographic.updateProjectionMatrix = vi.fn()
    updateCamera(orthographic, size)
    expect(orthographic.updateProjectionMatrix).not.toHaveBeenCalled()
  })
})

describe('findInitialRoot', () => {
  it('finds the nearest root for portals', () => {
    const portalStore = createMockStore()
    portalStore.getState().previousRoot = store

    const instance = prepare(new THREE.Object3D(), portalStore, '', {})
    const root = findInitialRoot(instance)

    expect(root).toBe(store)
  })

  it('falls back to the local root', () => {
    const instance = prepare(new THREE.Object3D(), store, '', {})
    const root = findInitialRoot(instance)

    expect(root).toBe(store)
  })
})
