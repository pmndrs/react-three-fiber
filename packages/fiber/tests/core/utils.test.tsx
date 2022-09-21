import * as React from 'react'
import { act, render } from 'react-nil'
import { create } from 'react-test-renderer'
import { is, useContextBridge, FiberProvider } from '../../src/core/utils'

describe('is', () => {
  const myFunc = () => null
  const myObj = { myProp: 'test-prop' }
  const myStr = 'test-string'
  const myNum = 1
  const myUnd = undefined
  const myArr = [1, 2, 3]

  it('should tell me if something IS a function', () => {
    expect(is.fun(myFunc)).toBe(true)

    expect(is.fun(myObj)).toBe(false)
    expect(is.fun(myStr)).toBe(false)
    expect(is.fun(myNum)).toBe(false)
    expect(is.fun(myUnd)).toBe(false)
    expect(is.fun(myArr)).toBe(false)
  })
  it('should tell me if something IS an object', () => {
    expect(is.obj(myFunc)).toBe(false)

    expect(is.obj(myObj)).toBe(true)

    expect(is.obj(myStr)).toBe(false)
    expect(is.obj(myNum)).toBe(false)
    expect(is.obj(myUnd)).toBe(false)
    expect(is.obj(myArr)).toBe(false)
  })
  it('should tell me if something IS a string', () => {
    expect(is.str(myFunc)).toBe(false)
    expect(is.str(myObj)).toBe(false)

    expect(is.str(myStr)).toBe(true)

    expect(is.str(myNum)).toBe(false)
    expect(is.str(myUnd)).toBe(false)
    expect(is.str(myArr)).toBe(false)
  })
  it('should tell me if something IS a number', () => {
    expect(is.num(myFunc)).toBe(false)
    expect(is.num(myObj)).toBe(false)
    expect(is.num(myStr)).toBe(false)

    expect(is.num(myNum)).toBe(true)

    expect(is.num(myUnd)).toBe(false)
    expect(is.num(myArr)).toBe(false)
  })
  it('should tell me if something IS undefined', () => {
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

describe('useContextBridge', () => {
  it('forwards live context between renderers', async () => {
    const Context1 = React.createContext<string>(null!)
    const Context2 = React.createContext<string>(null!)

    const values: string[] = []

    function Test() {
      values.push(React.useContext(Context1), React.useContext(Context2))

      return null
    }

    const Canvas = React.memo(() => {
      const [fiber, setFiber] = React.useState<any>(null)
      const Bridge = useContextBridge(fiber)
      render(
        <Bridge>
          <Test />
        </Bridge>,
      )

      return (
        <FiberProvider setFiber={setFiber}>
          <Context2.Provider value="invalid" />
        </FiberProvider>
      )
    })

    function Providers(props: { values: [value1: string, value2?: string]; children: React.ReactNode }) {
      const [value1, value2] = props.values
      return (
        <Context1.Provider value="invalid">
          <Context1.Provider value={value1}>
            {value2 ? <Context2.Provider value={value2}>{props.children}</Context2.Provider> : props.children}
          </Context1.Provider>
        </Context1.Provider>
      )
    }

    await act(async () =>
      create(
        <Providers values={['value1', 'value2']}>
          <Canvas />
        </Providers>,
      ),
    )

    await act(async () =>
      create(
        <Providers values={['value1__new', 'value2__new']}>
          <Canvas />
        </Providers>,
      ),
    )

    await act(async () =>
      create(
        <Providers values={['value1__new2']}>
          <Canvas />
        </Providers>,
      ),
    )

    expect(values).toStrictEqual(['value1', 'value2', 'value1__new', 'value2__new', 'value1__new2', null])
  })
})
