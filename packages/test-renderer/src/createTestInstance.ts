import { Object3D } from 'three'

import type { MockInstance, Obj, TestInstanceChildOpts } from './types/internal'

import { expectOne, matchProps, findAll } from './helpers/testInstance'

export class ReactThreeTestInstance<TObject extends Object3D = Object3D> {
  _fiber: MockInstance<TObject>

  constructor(fiber: MockInstance<TObject>) {
    this._fiber = fiber
  }

  public get fiber(): MockInstance<TObject> {
    return this._fiber
  }

  public get instance(): TObject {
    return this._fiber.object
  }

  public get type(): string {
    return this._fiber.object.type
  }

  public get props(): Obj {
    return this._fiber.props
  }

  public get parent(): ReactThreeTestInstance | null {
    const parent = this._fiber.parent
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
  ): ReactThreeTestInstance[] =>
    fiber.children
      .filter((child) => !child.props.attach || opts.exhaustive)
      .map((fib) => wrapFiber(fib as MockInstance))

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

const fiberToWrapper = new WeakMap<MockInstance>()
export const wrapFiber = (fiber: MockInstance): ReactThreeTestInstance => {
  let wrapper = fiberToWrapper.get(fiber)
  if (wrapper === undefined) {
    wrapper = new ReactThreeTestInstance(fiber)
    fiberToWrapper.set(fiber, wrapper)
  }
  return wrapper
}
