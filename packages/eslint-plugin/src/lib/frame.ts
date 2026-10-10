import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import {
  ancestors,
  calleeName,
  type FunctionNode,
  isCallTo,
  isFunction,
  mergeListeners,
  resolve,
  resolveFunction,
  soleDefinition,
} from './ast'

const FIBER_SOURCE = /^@react-three\/fiber(\/.*)?$/

/** Calls that run their callback argument on every frame, and which argument that is. */
const FRAME_CALLBACK_ARG: Record<string, number> = {
  useFrame: 0,
  addEffect: 0,
  addAfterEffect: 0,
  // setRenderOverride(store, fn): fn replaces the default render job
  setRenderOverride: 1,
}

const TRACKED_IMPORTS = new Set([...Object.keys(FRAME_CALLBACK_ARG), 'getScheduler'])
const GET_SCHEDULER = new Set(['getScheduler'])

export interface FrameMatch<T extends ESTree.Node> {
  /** The node a selector matched. */
  node: T
  /** The outermost callback the node runs inside of. */
  callback: FunctionNode
  /** Ancestors between the node and the callback, nearest first (the callback excluded). */
  path: ESTree.Node[]
}

export type FrameHandlers = Record<string, (match: FrameMatch<any>) => void>

/**
 * Runs `handlers` for nodes inside a per-frame callback.
 *
 * A callback is anything handed to `useFrame` (including imported aliases and `ns.useFrame`),
 * `addEffect`, `addAfterEffect`, `setRenderOverride` or the frame scheduler's `register`, either
 * inline or by reference to a function or `useCallback`. Functions nested inside a callback
 * count, since they are created (and usually run) every frame too.
 *
 * Matches are collected during traversal and resolved at the end of the file, so a callback
 * declared before the `useFrame` call that receives it is still found.
 */
export function frameLoopListener(ctx: Rule.RuleContext, handlers: FrameHandlers): Rule.RuleListener {
  const aliases = new Map<string, string>()
  const callbacks = new Set<ESTree.Node>()

  const importedName = (callee: ESTree.Node) => {
    const name = calleeName(callee)
    if (name === undefined) return undefined
    return callee.type === 'Identifier' ? (aliases.get(name) ?? name) : name
  }

  const isScheduler = (object: ESTree.Node): boolean => {
    // getScheduler().register(...)
    if (object.type === 'CallExpression') return importedName(object.callee) === 'getScheduler'
    // controls.scheduler.register(...)
    if (object.type === 'MemberExpression') return calleeName(object) === 'scheduler'
    if (object.type !== 'Identifier') return false
    // scheduler.register(...), const { scheduler } = useFrame()
    if (object.name === 'scheduler') return true
    // const s = getScheduler(); s.register(...)
    const def = soleDefinition(resolve(ctx, object))
    return def?.type === 'Variable' && isCallTo(def.node.init, GET_SCHEDULER)
  }

  const callbackOf = (call: ESTree.CallExpression): ESTree.Node | undefined => {
    const { callee } = call
    if (
      callee.type === 'MemberExpression' &&
      calleeName(callee) === 'register' &&
      isScheduler(callee.object as ESTree.Node)
    ) {
      return call.arguments[0] as ESTree.Node | undefined
    }
    const name = importedName(callee)
    if (name === undefined || !(name in FRAME_CALLBACK_ARG)) return undefined
    return call.arguments[FRAME_CALLBACK_ARG[name]] as ESTree.Node | undefined
  }

  const tracking: Rule.RuleListener = {
    ImportDeclaration(node) {
      if (typeof node.source.value !== 'string' || !FIBER_SOURCE.test(node.source.value)) return
      for (const specifier of node.specifiers) {
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier') continue
        if (TRACKED_IMPORTS.has(specifier.imported.name)) aliases.set(specifier.local.name, specifier.imported.name)
      }
    },
    CallExpression(node) {
      const callback = resolveFunction(ctx, callbackOf(node))
      if (callback) callbacks.add(callback)
    },
  }

  return mergeListeners(tracking, insideCallbacks(callbacks, handlers))
}

/**
 * Runs `handlers` for nodes inside any function in `callbacks`, once the whole file has been read
 * (so `callbacks` may be filled in after the nodes are visited).
 */
export function insideCallbacks(
  callbacks: { has(node: ESTree.Node): boolean },
  handlers: FrameHandlers,
): Rule.RuleListener {
  const pending: { selector: string; node: ESTree.Node }[] = []

  const collecting: Rule.RuleListener = Object.fromEntries(
    Object.keys(handlers).map((selector) => [selector, (node: ESTree.Node) => pending.push({ selector, node })]),
  )

  return mergeListeners(collecting, {
    'Program:exit'() {
      for (const { selector, node } of pending) {
        const path = ancestors(node)
        // The outermost callback wins, so `path` spans every nested function inside it
        let index = -1
        path.forEach((ancestor, i) => {
          if (isFunction(ancestor) && callbacks.has(ancestor)) index = i
        })
        if (index === -1) continue
        handlers[selector]({ node, callback: path[index] as FunctionNode, path: path.slice(0, index) })
      }
    },
  })
}
