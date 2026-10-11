import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import { fiberEntry } from '../lib/imports'
import { gitHubUrl } from '../lib/url'

/** Import paths that moved, and where to. */
const MOVED_PATHS: Record<string, { to: string; messageId: string }> = {
  '@react-three/fiber/native': { to: '@react-three/native', messageId: 'nativeMoved' },
  '@react-three/fiber/webgpu': { to: '@react-three/fiber', messageId: 'webgpuDeprecated' },
  '@react-three/test-renderer/webgpu': { to: '@react-three/test-renderer', messageId: 'webgpuDeprecated' },
}

/** TSL hooks that moved from `@react-three/fiber/webgpu` to `@react-three/tsl`. */
const TSL_HOOKS = new Set([
  'useUniforms',
  'useUniform',
  'useNodes',
  'useLocalNodes',
  'useBuffers',
  'useGPUStorage',
  'useRenderPipeline',
  'rebuildAllUniforms',
  'rebuildAllNodes',
  'rebuildAllBuffers',
  'rebuildAllStorage',
])

/** Exports that are gone, and what to use instead. */
const REMOVED: Record<string, string> = {
  act: "import `act` from 'react'",
  flushGlobalEffects: 'use useFrame phases, or the scheduler from getScheduler()',
  usePostProcessing: "renamed to `useRenderPipeline`, from '@react-three/tsl'",
  removeUniforms: 'use the `removeUniforms` returned by useUniforms()',
  clearScope: 'use `clearUniforms(scope)` returned by useUniforms()',
  clearRootUniforms: 'use `clearUniforms()` returned by useUniforms()',
  removeNodes: 'use the `removeNodes` returned by useNodes()',
  clearNodeScope: 'use `clearNodes(scope)` returned by useNodes()',
  clearRootNodes: 'use `clearNodes()` returned by useNodes()',
}
const REMOVED_SOURCES = /^@react-three\/(fiber(\/.*)?|tsl|test-renderer(\/.*)?)$/

type SourceNode = ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      nativeMoved: "`{{from}}` moved to its own package: import from '{{to}}'.",
      webgpuDeprecated:
        "`{{from}}` is deprecated and is removed in the first v10 beta: import from '{{to}}', which renders with WebGPU.",
      tslMoved: "`{{name}}` moved to '@react-three/tsl' in v10.",
      removed: '`{{name}}` was removed in v10: {{hint}}.',
    },
    docs: {
      url: gitHubUrl('no-removed-imports'),
      recommended: false,
      migration: true,
      description: 'Replace imports that v10 moved, deprecated or removed.',
    } as Rule.RuleMetaData['docs'],
    schema: [],
  },
  create(ctx) {
    /** The source literal rewritten to `to`, keeping its quotes. */
    const replaceSource = (source: ESTree.Literal, to: string) => (fixer: Rule.RuleFixer) => {
      const quote = ctx.sourceCode.getText(source)[0]
      return fixer.replaceText(source, `${quote}${to}${quote}`)
    }

    const check = (node: SourceNode) => {
      const source = node.source
      if (!source || typeof source.value !== 'string') return
      const from = source.value
      const specifiers = 'specifiers' in node ? node.specifiers : []
      const named = specifiers.flatMap((specifier) => {
        const imported =
          specifier.type === 'ImportSpecifier'
            ? specifier.imported
            : specifier.type === 'ExportSpecifier'
              ? specifier.local
              : undefined
        return imported?.type === 'Identifier' ? [{ name: imported.name, node: specifier }] : []
      })

      const tsl = fiberEntry(from) ? named.filter(({ name }) => TSL_HOOKS.has(name)) : []
      for (const { name, node: specifier } of tsl) {
        const onlyTsl = tsl.length === specifiers.length
        ctx.report({
          node: specifier,
          messageId: 'tslMoved',
          data: { name },
          // Rewrite the path only when every name moves with it
          fix: onlyTsl && specifier === specifiers[0] ? replaceSource(source, '@react-three/tsl') : null,
        })
      }

      if (REMOVED_SOURCES.test(from)) {
        for (const { name, node: specifier } of named) {
          if (name in REMOVED) {
            ctx.report({ node: specifier, messageId: 'removed', data: { name, hint: REMOVED[name] } })
          }
        }
      }

      const moved = MOVED_PATHS[from]
      if (moved && tsl.length === 0) {
        ctx.report({
          node: source,
          messageId: moved.messageId,
          data: { from, to: moved.to },
          fix: replaceSource(source, moved.to),
        })
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    }
  },
}

export default rule
