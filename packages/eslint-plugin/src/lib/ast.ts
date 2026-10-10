import type { Rule, Scope } from 'eslint'
import type * as ESTree from 'estree'

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression | ESTree.FunctionDeclaration

export function isFunction(node: ESTree.Node | null | undefined): node is FunctionNode {
  return (
    !!node &&
    (node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration')
  )
}

/** The name a call is made through: `foo()` and `ns.foo()` both give `foo`. */
export function calleeName(callee: ESTree.Node): string | undefined {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
    return callee.property.name
  }
  return undefined
}

/** Whether `node` calls a hook by name, directly or through a namespace (`React.useState`). */
export function isCallTo(
  node: ESTree.Node | null | undefined,
  names: ReadonlySet<string>,
): node is ESTree.CallExpression {
  if (!node || node.type !== 'CallExpression') return false
  const name = calleeName(node.callee)
  return name !== undefined && names.has(name)
}

/** Resolves an identifier to the variable it refers to, walking up from `scope`. */
export function findVariable(scope: Scope.Scope | null, name: string): Scope.Variable | undefined {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name)
    if (variable) return variable
  }
  return undefined
}

export function resolve(ctx: Rule.RuleContext, identifier: ESTree.Identifier): Scope.Variable | undefined {
  return findVariable(ctx.sourceCode.getScope(identifier), identifier.name)
}

/** The node a variable was declared with, when it was declared exactly once. */
export function soleDefinition(variable: Scope.Variable | undefined): Scope.Definition | undefined {
  return variable && variable.defs.length === 1 ? variable.defs[0] : undefined
}

/**
 * The function a callback argument evaluates to: an inline function, or an identifier bound to a
 * function declaration, a function expression or `useCallback(fn, deps)`.
 */
export function resolveFunction(
  ctx: Rule.RuleContext,
  node: ESTree.Node | undefined,
  useCallbackNames: ReadonlySet<string> = USE_CALLBACK,
): FunctionNode | undefined {
  if (!node) return undefined
  if (isFunction(node)) return node
  if (node.type !== 'Identifier') return undefined

  const def = soleDefinition(resolve(ctx, node))
  if (!def) return undefined
  if (def.type === 'FunctionName') return def.node as ESTree.FunctionDeclaration
  if (def.type !== 'Variable' || def.node.id.type !== 'Identifier') return undefined

  const init = def.node.init
  if (isFunction(init)) return init
  if (isCallTo(init, useCallbackNames) && isFunction(init.arguments[0] as ESTree.Node)) {
    return init.arguments[0] as FunctionNode
  }
  return undefined
}

const USE_CALLBACK = new Set(['useCallback'])

export function parentOf(node: ESTree.Node): ESTree.Node | undefined {
  return (node as Rule.Node).parent ?? undefined
}

/** Ancestors of `node`, nearest first. */
export function ancestors(node: ESTree.Node): ESTree.Node[] {
  const list: ESTree.Node[] = []
  for (let current = parentOf(node); current; current = parentOf(current)) list.push(current)
  return list
}

/** Combines rule listeners, calling every handler registered for the same selector. */
export function mergeListeners(...listeners: Rule.RuleListener[]): Rule.RuleListener {
  const merged: Record<string, ((...args: any[]) => void)[]> = {}
  for (const listener of listeners) {
    for (const [selector, handler] of Object.entries(listener)) {
      if (handler) (merged[selector] ??= []).push(handler as (...args: any[]) => void)
    }
  }
  return Object.fromEntries(
    Object.entries(merged).map(([selector, handlers]) => [
      selector,
      (...args: any[]) => handlers.forEach((handler) => handler(...args)),
    ]),
  ) as Rule.RuleListener
}
