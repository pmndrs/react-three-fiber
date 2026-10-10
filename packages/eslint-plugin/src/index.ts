// THIS FILE WAS GENERATED DO NOT MODIFY BY HAND
// @command pnpm codegen:eslint

import type { ESLint, Linter } from 'eslint'
import all from './configs/all'
import migration from './configs/migration'
import recommended from './configs/recommended'
import rules from './rules/index'

type Configs = {
  all: Linter.Config
  migration: Linter.Config
  recommended: Linter.Config
  'legacy-all': Linter.LegacyConfig
  'legacy-migration': Linter.LegacyConfig
  'legacy-recommended': Linter.LegacyConfig
}

const plugin: ESLint.Plugin & { rules: typeof rules; configs: Configs } = {
  meta: { name: '@react-three/eslint-plugin' },
  rules,
  configs: {} as Configs,
}

/** A flat config (ESLint 9+, or ESLint 8 with eslint.config.js) that registers the plugin itself. */
const flat = (name: string, legacy: Linter.LegacyConfig): Linter.Config => ({
  name: `@react-three/${name}`,
  plugins: { '@react-three': plugin },
  rules: legacy.rules,
})

export const configs: Configs = {
  all: flat('all', all),
  migration: flat('migration', migration),
  recommended: flat('recommended', recommended),
  'legacy-all': all,
  'legacy-migration': migration,
  'legacy-recommended': recommended,
}

plugin.configs = configs

export { rules }
export default plugin
