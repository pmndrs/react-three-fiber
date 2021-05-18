import { Object3D } from 'three'

import type { MockInstance, MockScene, Obj, TestInstanceChildOpts } from './types/internal'

import { expectOne, matchProps, findAll } from './helpers/testInstance'

export class ReactThreeTestInstance<TInstance extends Object3D = Object3D> {
  _fiber: MockInstance

  constructor(fiber: MockInstance | MockScene) {
    this._fiber = fiber as MockInstance
  }

  public get instance(): Object3D {
    return this._fiber as unknown as TInstance
  }

  public get type(): string {
    return this._fiber.type
  }

  public get props(): Obj {
    return this._fiber.__r3f.memoizedProps
  }

  public get parent(): ReactThreeTestInstance | null {
    const parent = this._fiber.parent as MockInstance
    if (parent !== null) {
      return wrapFiber(parent)
    }
    return parent
  }

  public get children(): ReactThreeTestInstance[] {
    return this.getChildren(this._fiber)
  }

  public get allChildren(): ReactThreeTestInstance[] {
    return this.getChildren(this._fiber, { exhaustive: true })
  }

  private getChildren = (
    fiber: MockInstance,
    opts: TestInstanceChildOpts = { exhaustive: false },
  ): ReactThreeTestInstance[] => {
    if (opts.exhaustive) {
      /**
       * this will return objects like
       * color or effects etc.
       */
      return [
        ...(fiber.children || []).map((fib) => wrapFiber(fib as MockInstance)),
        ...fiber.__r3f.objects.map((fib) => wrapFiber(fib as MockInstance)),
      ]
    } else {
      return (fiber.children || []).map((fib) => wrapFiber(fib as MockInstance))
    }
  }

  public find = (decider: (node: ReactThreeTestInstance) => boolean): ReactThreeTestInstance =>
    expectOne(findAll(this, decider), `matching custom checker: ${decider.toString()}`)

  public findAll = (decider: (node: ReactThreeTestInstance) => boolean): ReactThreeTestInstance[] =>
    findAll(this, decider)

  public findByType = (type: string): ReactThreeTestInstance =>
    expectOne(
      findAll(this, (node) => Boolean(node.type && node.type === type)),
      `with node type: "${type || 'Unknown'}"`,
    )

  public findAllByType = (type: string): ReactThreeTestInstance[] =>
    findAll(this, (node) => Boolean(node.type && node.type === type))

  public findByProps = (props: Obj): ReactThreeTestInstance =>
    expectOne(this.findAllByProps(props), `with props: ${JSON.stringify(props)}`)

  public findAllByProps = (props: Obj): ReactThreeTestInstance[] =>
    findAll(this, (node: ReactThreeTestInstance) => Boolean(node.props && matchProps(node.props, props)))
}

const fiberToWrapper = new WeakMap<MockInstance | MockScene>()
export const wrapFiber = (fiber: MockInstance | MockScene): ReactThreeTestInstance => {
  let wrapper = fiberToWrapper.get(fiber)
  if (wrapper === undefined) {
    wrapper = new ReactThreeTestInstance(fiber)
    fiberToWrapper.set(fiber, wrapper)
  }
  return wrapper
}
