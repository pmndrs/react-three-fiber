import type { Rule } from 'eslint'
import type * as ESTree from 'estree'

export type FiberEntry = 'default' | 'legacy' | 'webgpu' | 'extension' | 'native'

const ENTRIES: Record<string, FiberEntry> = {
  '@react-three/fiber': 'default',
  '@react-three/fiber/legacy': 'legacy',
  '@react-three/fiber/webgpu': 'webgpu',
  '@react-three/fiber/extension': 'extension',
  '@react-three/fiber/native': 'native',
}

/** Which `@react-three/fiber` entry an import source names, if any. */
export function fiberEntry(source: unknown): FiberEntry | undefined {
  return typeof source === 'string' ? ENTRIES[source] : undefined
}

/** Entries that render with WebGPURenderer. */
export const WEBGPU_ENTRIES: ReadonlySet<FiberEntry> = new Set(['default', 'webgpu'])

export interface FiberImport {
  imported: string
  entry: FiberEntry
}

export interface FiberImports {
  listener: Rule.RuleListener
  /** The fiber export a local name was imported as. */
  get(local: string): FiberImport | undefined
  /** The entries a fiber export was imported from in this file. */
  entriesOf(imported: string): Set<FiberEntry>
}

/** Tracks named imports from `@react-three/fiber` and its entries. */
export function trackFiberImports(): FiberImports {
  const locals = new Map<string, FiberImport>()

  return {
    listener: {
      ImportDeclaration(node: ESTree.ImportDeclaration) {
        const entry = fiberEntry(node.source.value)
        if (!entry) return
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier') continue
          locals.set(specifier.local.name, { imported: specifier.imported.name, entry })
        }
      },
    },
    get: (local) => locals.get(local),
    entriesOf(imported) {
      const entries = new Set<FiberEntry>()
      for (const value of locals.values()) if (value.imported === imported) entries.add(value.entry)
      return entries
    },
  }
}
