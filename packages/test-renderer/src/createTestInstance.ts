import type * as THREE from 'three'
import type { Instance } from '@react-three/fiber'

import type { Obj, TestInstanceChildOpts } from './types/internal'

import { expectOne, matchProps, findAll } from './helpers/testInstance'

// Helper to create a minimal wrapper for THREE.Object3D children of primitives
const createVirtualInstance = (object: THREE.Object3D, parent: Instance<any>): Instance<THREE.Object3D> => {
  // Create the virtual instance for this object
  // we can't import the prepare method from packages/fiber/src/core/utils.tsx so we do what we can
  const instance: Instance<THREE.Object3D> = {
    root: parent.root,
    type: object.type.toLowerCase(), // Convert to lowercase to match R3F convention
    parent,
    children: [],
    props: { object },
    object,
    eventCount: 0,
    handlers: {},
    isHidden: false,
  }

  // Recursively process children if they exist
  if (object.children && object.children.length > 0) {
    const objectChildren = object.children as THREE.Object3D[]
    instance.children = Array.from(objectChildren).map((child) => createVirtualInstance(child, instance))
  }

  return instance
}

export class ReactThreeTestInstance<TObject extends THREE.Object3D = THREE.Object3D> {
  _fiber: Instance<TObject>

  constructor(fiber: Instance<TObject>) {
    this._fiber = fiber
  }

  public get fiber(): Instance<TObject> {
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
    fiber: Instance,
    opts: TestInstanceChildOpts = { exhaustive: false },
  ): ReactThreeTestInstance[] => {
    // Get standard R3F children
    const r3fChildren = fiber.children
      .filter((child) => !child.props.attach || opts.exhaustive)
      .map((fib) => wrapFiber(fib as Instance))

    // For primitives, also add THREE.js object children
    if (fiber.type === 'primitive' && fiber.object.children?.length) {
      const threeChildren = fiber.object.children.map((child: THREE.Object3D) => {
        // Create a virtual instance that wraps the THREE.js child
        const virtualInstance = createVirtualInstance(child, fiber)
        return wrapFiber(virtualInstance)
      })

      r3fChildren.push(...threeChildren)

      return r3fChildren
    }

    return r3fChildren
  }

  public findAll = (decider: (node: ReactThreeTestInstance) => boolean): ReactThreeTestInstance[] =>
    findAll(this as unknown as ReactThreeTestInstance, decider, { includeRoot: false })

  public find = (decider: (node: ReactThreeTestInstance) => boolean): ReactThreeTestInstance =>
    expectOne(this.findAll(decider), `matching custom checker: ${decider.toString()}`)

  public findByType = (type: string): ReactThreeTestInstance =>
    expectOne(
      this.findAll((node) => Boolean(node.type && node.type === type)),
      `with node type: "${type || 'Unknown'}"`,
    )

  public findAllByType = (type: string): ReactThreeTestInstance[] =>
    this.findAll((node) => Boolean(node.type && node.type === type))

  public findByProps = (props: Obj): ReactThreeTestInstance =>
    expectOne(this.findAllByProps(props), `with props: ${JSON.stringify(props)}`)

  public findAllByProps = (props: Obj): ReactThreeTestInstance[] =>
    this.findAll((node: ReactThreeTestInstance) => Boolean(node.props && matchProps(node.props, props)))
}

const fiberToWrapper = new WeakMap<Instance>()
export const wrapFiber = (fiber: Instance): ReactThreeTestInstance => {
  let wrapper = fiberToWrapper.get(fiber)
  if (wrapper === undefined) {
    wrapper = new ReactThreeTestInstance(fiber)
    fiberToWrapper.set(fiber, wrapper)
  }
  return wrapper
}
