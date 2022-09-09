import * as THREE from 'three'
import { is, resolve, applyProps } from '../src/core/utils'

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

describe('applyProps', () => {
  it('should apply props to foreign objects', () => {
    const target = new THREE.Object3D()
    expect(() => applyProps(target, {})).not.toThrow()
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

    const target = { color }

    // Same constructor
    applyProps(target, { color: new THREE.Color() })
    expect(target.color).toBeInstanceOf(THREE.Color)
    expect(color.copy).toHaveBeenCalledTimes(1)

    // Different constructor
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
    const target = new THREE.Object3D()
    applyProps(target, { scale: 5 })

    expect(target.scale.toArray()).toStrictEqual([5, 5, 5])

    const material = new THREE.MeshBasicMaterial()
    applyProps(material, { color: 0x000000 })

    expect(material.color.getHex()).toBe(0x000000)
  })

  it('should pierce into nested properties', () => {
    const target = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>()
    applyProps(target, { 'material-color': 0x000000 })

    expect(target.material.color.getHex()).toBe(0x000000)
  })
})
