import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { ancestors, calleeName, isCallTo, isFunction, parentOf, resolve, soleDefinition } from '../lib/ast'
import { gitHubUrl } from '../lib/url'

/** Hooks whose callback runs outside Suspense: effects, and memo/state initialisers. */
const HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useMemo', 'useState'])
const LOADER_CLASS = /Loader$/

/** `new GLTFLoader()`, `new THREE.TextureLoader()` */
function isNewLoader(node: ESTree.Node | null | undefined): boolean {
  return node?.type === 'NewExpression' && LOADER_CLASS.test(calleeName(node.callee as ESTree.Node) ?? '')
}

/** The receiver is a three.js loader: constructed inline, or a variable initialised with one. */
function isLoader(ctx: Rule.RuleContext, object: ESTree.Node): boolean {
  if (isNewLoader(object)) return true
  if (object.type !== 'Identifier') return false
  const def = soleDefinition(resolve(ctx, object))
  return def?.type === 'Variable' && isNewLoader(def.node.init)
}

/** The hook whose callback (the hook's first argument) contains `node`, if any. */
function enclosingHook(node: ESTree.Node): string | undefined {
  for (const ancestor of ancestors(node)) {
    if (!isFunction(ancestor)) continue
    const call = parentOf(ancestor)
    if (isCallTo(call, HOOKS) && call.arguments[0] === ancestor) return calleeName(call.callee)
  }
  return undefined
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    messages: {
      preferUseLoader:
        'Loading with {{method}}() inside {{hook}} skips caching and Suspense. Use useLoader (or useTexture for textures) instead: ' +
        'it suspends while loading and shares one copy of each asset across components, on both CPU and GPU.',
    },
    docs: {
      url: gitHubUrl('prefer-useloader'),
      recommended: true,
      description: 'Prefer useLoader over calling a three.js loader inside effects and memos.',
    },
    schema: [],
  },
  create(ctx) {
    return {
      'CallExpression[callee.type=MemberExpression]'(node: ESTree.CallExpression) {
        const callee = node.callee as ESTree.MemberExpression
        const method = calleeName(callee)
        if (method !== 'load' && method !== 'loadAsync') return
        if (!isLoader(ctx, callee.object as ESTree.Node)) return
        const hook = enclosingHook(node)
        if (hook) ctx.report({ messageId: 'preferUseLoader', node, data: { method, hook } })
      },
    }
  },
}

export default rule
