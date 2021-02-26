import * as THREE from 'three'
import * as React from 'react'
// @ts-ignore
import Reconciler from 'react-reconciler'
// @ts-ignore
//import Reconciler from 'react-reconciler/cjs/react-reconciler.production.min'
import { unstable_now as now, unstable_IdlePriority as idlePriority, unstable_runWithPriority as run } from 'scheduler'

import { CanvasContext, CanvasProps, RootsValue } from '../types/index'
import { GlobalRenderCallback, ObjectHash, ThreeScene } from '../types/internal'

import { is } from './helpers/is'

import { name, version } from '../../package.json'
import { parseIsolatedEntityName } from 'typescript'

export const roots = new Map<HTMLCanvasElement, RootsValue>()

export type RendererFunctions = {
  applyProps: typeof applyProps
  invalidate: typeof invalidate
}

const emptyObject = {}

function createSubs(callback: GlobalRenderCallback, subs: GlobalRenderCallback[]): () => void {
  const index = subs.length
  subs.push(callback)
  return () => void subs.splice(index, 1)
}

let globalEffects: GlobalRenderCallback[] = []
let globalAfterEffects: GlobalRenderCallback[] = []
let globalTailEffects: GlobalRenderCallback[] = []
export const addEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalEffects)
export const addAfterEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalAfterEffects)
export const addTail = (callback: GlobalRenderCallback) => createSubs(callback, globalTailEffects)

export function renderGl(state: CanvasContext, timestamp: number, repeat = 0, runGlobalEffects = false) {
  let i
  // Run global effects
  if (runGlobalEffects) {
    for (i = 0; i < globalEffects.length; i++) {
      globalEffects[i](timestamp)
      repeat++
    }
  }

  // Run local effects
  const delta = state.clock.getDelta()

  for (i = 0; i < state.subscribers.length; i++) {
    state.subscribers[i].ref.current(state, delta)
  }

  // Decrease frame count
  state.frames = Math.max(0, state.frames - 1)
  repeat += !state.invalidateFrameloop ? 1 : state.frames
  // Render content
  if (!state.manual && state.gl.render) {
    // console.log('calling gl.render', state.gl)
    state.gl.render(state.scene, state.camera)
  }

  // Run global after-effects
  if (runGlobalEffects) {
    for (i = 0; i < globalAfterEffects.length; i++) {
      globalAfterEffects[i](timestamp)
    }
  }

  return repeat
}

let running = false
function renderLoop(timestamp: number) {
  running = true

  let repeat = 0
  let i
  // Run global effects
  for (i = 0; i < globalEffects.length; i++) {
    globalEffects[i](timestamp)
    repeat++
  }

  roots.forEach((rootState) => {
    const { active, ready, invalidateFrameloop, frames, scene } = rootState.getState()
    // If the frameloop is invalidated, do not run another frame
    if (active && ready && (!invalidateFrameloop || frames > 0)) {
      repeat = renderGl(rootState.getState(), timestamp, repeat)
    } else {
      repeat = 0
    }
  })

  // Run global after-effects
  for (i = 0; i < globalAfterEffects.length; i++) {
    globalAfterEffects[i](timestamp)
  }

  if (repeat !== 0) {
    return requestAnimationFrame(renderLoop)
  } else {
    // Tail call effects, they are called when rendering stops
    for (i = 0; i < globalTailEffects.length; i++) {
      globalTailEffects[i](timestamp)
    }
  }
  // Flag end of operation
  running = false
}

export function invalidate(state: CanvasContext | boolean = true, frames = 1) {
  console.log('calling invalidate', frames)
  if (!is.obj(state)) {
    roots.forEach((rootState) => {
      const { frames, ready } = rootState.getState()
      // im not sure what's going on here, it's a redefine?
      rootState.getState().frames = ready ? frames + frames : frames
    })
  } else if (is.obj(state)) {
    if ((state as CanvasContext).vr) {
      return
    }
    // note to self, state is missing ready. why tho
    state.frames = state.ready ? state.frames + frames : frames
  }
  if (!running) {
    running = true
    console.log('calling raf for renderloop')
    requestAnimationFrame(renderLoop)
  }
}

export function forceResize() {
  roots.forEach((rootState) => {
    const root = rootState.getState().root
    // root.containerInfo.__state.forceResize()
  })
}

let catalogue: ObjectHash = {}
export const extend = (objects: object): void => void (catalogue = { ...catalogue, ...objects })

export function applyProps(instance: any, newProps: any, oldProps: any = {}, accumulative = false) {
  // Filter equals, events and reserved props
  const container = instance.__container

  const sameProps = [] as string[]
  const handlers = [] as string[]

  let i
  let keys = Object.keys(newProps)

  for (i = 0; i < keys.length; i++) {
    if (is.equ(newProps[keys[i]], oldProps[keys[i]])) {
      sameProps.push(keys[i])
    }

    // Event-handlers ...
    //   are functions, that
    //   start with "on", and
    //   contain the name "Pointer", "Click", "ContextMenu", or "Wheel"
    if (is.fun(newProps[keys[i]]) && keys[i].startsWith('on')) {
      if (
        keys[i].includes('Pointer') ||
        keys[i].includes('Click') ||
        keys[i].includes('ContextMenu') ||
        keys[i].includes('Wheel')
      ) {
        handlers.push(keys[i])
      }
    }
  }

  const leftOvers = [] as string[]
  keys = Object.keys(oldProps)
  if (accumulative) {
    for (i = 0; i < keys.length; i++) {
      if (newProps[keys[i]] === void 0) {
        leftOvers.push(keys[i])
      }
    }
  }

  const toFilter = [...sameProps, 'children', 'key', 'ref']
  // Instances use "object" as a reserved identifier
  if (instance.__instance) toFilter.push('object')
  const filteredProps = { ...newProps }

  // Removes sameProps and reserved props from newProps
  keys = Object.keys(filteredProps)
  for (i = 0; i < keys.length; i++) {
    if (toFilter.indexOf(keys[i]) > -1) {
      delete filteredProps[keys[i]]
    }
  }

  // Add left-overs as undefined props so they can be removed
  keys = Object.keys(leftOvers)
  for (i = 0; i < keys.length; i++) {
    if (keys[i] !== 'children') {
      filteredProps[keys[i]] = undefined
    }
  }

  const filteredPropsEntries = Object.entries(filteredProps)
  if (filteredPropsEntries.length > 0) {
    filteredPropsEntries.forEach(([key, value]) => {
      if (!handlers.includes(key)) {
        let root = instance
        let target = root[key]
        if (key.includes('-')) {
          const entries = key.split('-')
          target = entries.reduce((acc, key) => acc[key], instance)
          // If the target is atomic, it forces us to switch the root
          if (!(target && target.set)) {
            const [name, ...reverseEntries] = entries.reverse()
            root = reverseEntries.reverse().reduce((acc, key) => acc[key], instance)
            key = name
          }
        }
        // Special treatment for objects with support for set/copy
        const isColorManagement = instance.__container?.__state?.colorManagement
        if (target && target.set && (target.copy || target instanceof THREE.Layers)) {
          // If value is an array it has got to be the set function
          if (Array.isArray(value)) {
            target.set(...value)
          }
          // Test again target.copy(class) next ...
          else if (
            target.copy &&
            value &&
            (value as any).constructor &&
            target.constructor.name === (value as any).constructor.name
          ) {
            target.copy(value)
          }
          // If nothing else fits, just set the single value, ignore undefined
          // https://github.com/react-spring/react-three-fiber/issues/274
          else if (value !== undefined) {
            target.set(value)
            // Auto-convert sRGB colors, for now ...
            // https://github.com/react-spring/react-three-fiber/issues/344
            if (isColorManagement && target instanceof THREE.Color) {
              target.convertSRGBToLinear()
            }
          }
          // Else, just overwrite the value
        } else {
          root[key] = value
          // Auto-convert sRGB textures, for now ...
          // https://github.com/react-spring/react-three-fiber/issues/344
          if (isColorManagement && root[key] instanceof THREE.Texture) {
            root[key].encoding = THREE.sRGBEncoding
          }
        }
        invalidateInstance(instance)
      }
    })

    // Preemptively delete the instance from the containers interaction
    if (accumulative && container && instance.raycast && instance.__handlers) {
      instance.__handlers = undefined
      // const index = container.__interaction.indexOf(instance)
      // if (index > -1) container.__interaction.splice(index, 1)
    }

    // Prep interaction handlers
    if (handlers.length) {
      // if (accumulative && container && instance.raycast) container.__interaction.push(instance)
      // Add handlers to the instances handler-map
      instance.__handlers = handlers.reduce((acc, key) => {
        acc[key.charAt(2).toLowerCase() + key.substr(3)] = newProps[key]
        return acc
      }, {} as { [key: string]: any })
    }
    // Call the update lifecycle when it is being updated, but only when it is part of the scene
    if (instance.parent) updateInstance(instance)
  }
}

function invalidateInstance(instance: any) {
  console.log('invalidate instance - ', instance)
  if (instance.__container) {
    invalidate(instance.__container)
  }
}

function updateInstance(instance: any) {
  console.log('calling updateInstance')
  if (instance.onUpdate) instance.onUpdate(instance)
}

function createInstance(
  type: string,
  { args = [], ...props },
  container: HTMLCanvasElement,
  hostContext: any,
  internalInstanceHandle: Reconciler.Fiber
) {
  console.log('calling createInstance', props.object)
  let name = `${type[0].toUpperCase()}${type.slice(1)}`
  let instance
  if (type === 'primitive') {
    // Switch off dispose for primitive objects
    props = { dispose: null, ...props }
    instance = props.object
    instance.__instance = true
    instance.__dispose = instance.dispose
  } else {
    const target = (catalogue as any)[name] || (THREE as any)[name]

    if (!target) {
      throw `"${name}" is not part of the THREE namespace! Did you forget to extend it? See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#using-3rd-party-objects-declaratively`
    }

    instance = is.arr(args) ? new target(...args) : new target(args)
  }

  // Bind to the root container in case portals are being used
  // This is perhaps better for event management as we can keep them on a single instance
  while ((container as any).__container) {
    container = (container as any).__container
  }

  // TODO: https://github.com/facebook/react/issues/17147
  // If it's still not there it means the portal was created on a virtual node outside of react
  if (!roots.has(container)) {
    const fn = (node: Reconciler.Fiber): HTMLCanvasElement => {
      if (!node.return) return node.stateNode && node.stateNode.containerInfo
      else return fn(node.return)
    }
    container = fn(internalInstanceHandle)
  }

  // Apply initial props
  instance.__objects = []
  instance.__container = container

  // Auto-attach geometries and materials
  if (name.endsWith('Geometry')) {
    props = { attach: 'geometry', ...props }
  } else if (name.endsWith('Material')) {
    props = { attach: 'material', ...props }
  }

  // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
  // view yet. If the callback relies on references for instance, they won't be ready yet, this is
  // why it passes "true" here
  applyProps(instance, props, {})
  return instance
}

function appendChild(parentInstance: THREE.Object3D, child: any) {
  if (child) {
    console.log('calling appendChild', parentInstance, child)
    if (child.isObject3D) {
      console.log('adding to scene')
      parentInstance.add(child)
    } else {
      console.log('pushing to the scene __objects')
      //@ts-ignore
      parentInstance.__objects.push(child)
      child.parent = parentInstance
      // The attach attribute implies that the object attaches itself on the parent
      if (child.attachArray) {
        //@ts-ignore
        if (!is.arr(scene[child.attachArray])) parentInstance[child.attachArray] = []
        //@ts-ignore
        parentInstance[child.attachArray].push(child)
      } else if (child.attachObject) {
        //@ts-ignore
        if (!is.obj(scene[child.attachObject[0]])) parentInstance[child.attachObject[0]] = {}
        //@ts-ignore
        parentInstance[child.attachObject[0]][child.attachObject[1]] = child
      } else if (child.attach) {
        //@ts-ignore
        parentInstance[child.attach] = child
      }
    }
    updateInstance(child)
    invalidateInstance(child)
  }
}

function insertBefore(parentInstance: any, child: any, beforeChild: any) {
  console.log('calling insert before')
  const root = roots.get(parentInstance)
  if (child && root) {
    const scene = root.getState().scene
    if (child.isObject3D) {
      child.parent = scene
      child.dispatchEvent({ type: 'added' })
      const restSiblings = scene.children.filter((sibling: any) => sibling !== child)
      // TODO: the order is out of whack if data objects are present, has to be recalculated
      const index = restSiblings.indexOf(beforeChild)
      scene.children = [...restSiblings.slice(0, index), child, ...restSiblings.slice(index)]
      updateInstance(child)
    } else {
      appendChild(parentInstance, child)
    } // TODO: order!!!
    invalidateInstance(child)
  }
}

function removeRecursive(array: any, parent: any, clone = false) {
  if (array) {
    // Three uses splice op's internally we may have to shallow-clone the array in order to safely remove items
    const target = clone ? [...array] : array
    target.forEach((child: any) => removeChild(parent, child))
  }
}

function removeChild(parentScene: ThreeScene, child: any) {
  if (child && parentScene) {
    if (child.isObject3D) {
      console.log('calling scene.remove')
      parentScene.remove(child)
    } else {
      child.parent = null
      if (parentScene.__objects) parentScene.__objects = parentScene.__objects.filter((x: any) => x !== child)
      // Remove attachment
      if (child.attachArray) {
        // @ts-ignore
        scene[child.attachArray] = scene[child.attachArray].filter((x: any) => x !== child)
      } else if (child.attachObject) {
        // @ts-ignore
        delete scene[child.attachObject[0]][child.attachObject[1]]
      } else if (child.attach) {
        // @ts-ignore
        scene[child.attach] = null
      }
    }

    // Remove interactivity
    if (child.__container) {
      // temp remove interaction
      // child.__container.__interaction = child.__container.__interaction.filter((x: any) => x !== child)
    }
    invalidateInstance(child)

    // Allow objects to bail out of recursive dispose alltogether by passing dispose={null}
    if (child.dispose !== null) {
      run(idlePriority, () => {
        // Remove nested child objects
        removeRecursive(child.__objects, child)
        removeRecursive(child.children, child, true)
        // Dispose item
        if (child.dispose && child.type !== 'Scene') child.dispose()
        else if (child.__dispose) child.__dispose()
        // Remove references
        delete child.__container
        delete child.__objects
      })
    }
  }
}

function switchInstance(instance: any, type: string, newProps: any, fiber: Reconciler.Fiber) {
  console.log('calling switchInstance', instance)
  const parent = instance.parent
  const newInstance = createInstance(type, newProps, instance.__container, null, fiber)
  removeChild(parent, instance)
  appendChild(parent, newInstance)
  // This evil hack switches the react-internal fiber node
  // https://github.com/facebook/react/issues/14983
  // https://github.com/facebook/react/pull/15021
  ;[fiber, fiber.alternate].forEach((fiber: any) => {
    if (fiber !== null) {
      fiber.stateNode = newInstance
      if (fiber.ref) {
        if (is.fun(fiber.ref)) fiber.ref(newInstance)
        else (fiber.ref as Reconciler.RefObject).current = newInstance
      }
    }
  })
}

const Renderer = Reconciler({
  now,
  createInstance,
  removeChild: removeChild,
  appendChild,
  insertBefore,
  warnsIfNotActing: true,
  supportsMutation: true,
  isPrimaryRenderer: false,
  scheduleTimeout: is.fun(setTimeout) ? setTimeout : undefined,
  cancelTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
  // @ts-ignore
  setTimeout: is.fun(setTimeout) ? setTimeout : undefined,
  // @ts-ignore
  clearTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
  noTimeout: -1,
  appendInitialChild: appendChild,
  appendChildToContainer: (container: HTMLCanvasElement, child: THREE.Object3D) => {
    /**
     * we don't actually want to "append" or child to a container
     * the container is a canvas element, actually what we want
     * is to append it to the scene.
     */
    const rootVal = roots.get(container)
    if (rootVal) {
      const scene = rootVal.getState().scene
      appendChild(scene, child)
    }
  },
  removeChildFromContainer: removeChild,
  insertInContainerBefore: insertBefore,
  commitUpdate(instance: any, updatePayload: any, type: string, oldProps: any, newProps: any, fiber: Reconciler.Fiber) {
    if (instance.__instance && newProps.object && newProps.object !== instance) {
      // <instance object={...} /> where the object reference has changed
      switchInstance(instance, type, newProps, fiber)
    } else {
      // This is a data object, let's extract critical information about it
      const { args: argsNew = [], ...restNew } = newProps
      const { args: argsOld = [], ...restOld } = oldProps
      // If it has new props or arguments, then it needs to be re-instanciated
      const hasNewArgs = argsNew.some((value: any, index: number) =>
        is.obj(value)
          ? Object.entries(value).some(([key, val]) => val !== argsOld[index][key])
          : value !== argsOld[index]
      )
      if (hasNewArgs) {
        // Next we create a new instance and append it again
        switchInstance(instance, type, newProps, fiber)
      } else {
        // Otherwise just overwrite props
        applyProps(instance, restNew, restOld, true)
      }
    }
  },
  hideInstance(instance: any) {
    if (instance.isObject3D) {
      instance.visible = false
      invalidateInstance(instance)
    }
  },
  unhideInstance(instance: any, props: any) {
    if ((instance.isObject3D && props.visible == null) || props.visible) {
      instance.visible = true
      invalidateInstance(instance)
    }
  },
  hideTextInstance() {
    throw new Error(
      'Text is not allowed in the react-three-fibre tree. You may have extraneous whitespace between components.'
    )
  },
  getPublicInstance(instance: any) {
    return instance
  },
  getRootHostContext() {
    return emptyObject
  },
  getChildHostContext() {
    return emptyObject
  },
  createTextInstance() {},
  finalizeInitialChildren(instance: any) {
    // https://github.com/facebook/react/issues/20271
    // Returning true will trigger commitMount
    return instance.__handlers
  },
  commitMount(instance: any /*, type, props*/) {
    // https://github.com/facebook/react/issues/20271
    // This will make sure events are only added once to the central container
    const container = instance.__container
    // if (container && instance.raycast && instance.__handlers) container.__interaction.push(instance)
  },
  prepareUpdate() {
    return emptyObject
  },
  shouldDeprioritizeSubtree() {
    return false
  },
  prepareForCommit() {
    return null
  },
  preparePortalMount() {
    return null
  },
  resetAfterCommit() {},
  shouldSetTextContent() {
    return false
  },
  clearContainer() {
    return false
  },
})

Renderer.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  //@ts-ignore
  findHostInstanceByFiber: () => null,
  version: version,
  rendererPackageName: name,
})

export { Renderer }
