import type { Rule } from 'eslint'
import fs from 'fs/promises'
import { dirname, join, extname, relative } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import lodash from 'lodash'
import { format, resolveConfig } from 'prettier'

const { camelCase } = lodash
const __dirname = dirname(fileURLToPath(import.meta.url))

const jsHeader = (file: string) =>
  `// THIS FILE WAS GENERATED DO NOT MODIFY BY HAND
// @command pnpm codegen:eslint
` + file

/** `meta.docs.migration`: a rule for upgrading from v9, enabled by the `migration` config. */
const isMigration = (rule: Rule.RuleModule) =>
  Boolean((rule.meta?.docs as { migration?: boolean } | undefined)?.migration)

interface FoundRule {
  module: Rule.RuleModule
  moduleName: string
}

interface GeneratedConfig {
  name: string
  fileName: string
  path: string
}

const ignore = ['index.ts']
const srcDir = join(__dirname, '../src')
const docsDir = join(__dirname, '../docs/rules')
const rulesDir = join(srcDir, 'rules')
const configsDir = join(srcDir, 'configs')
const generatedConfigs: GeneratedConfig[] = []

async function ruleDocsPath(name: string): Promise<string> {
  const absolutePath = join(docsDir, name + '.md')
  const relativePath = '.' + absolutePath.replace(process.cwd(), '')

  try {
    await fs.readFile(absolutePath)
    return relativePath
  } catch (_) {
    throw new Error(`invariant: rule ${name} should have docs at ${absolutePath}`)
  }
}

async function generateConfig(name: string, rules: FoundRule[]) {
  const code = `
    import type { Linter } from 'eslint'

    export default {
      plugins: ['@react-three'],
      rules: {
        ${rules.map((rule) => `'@react-three/${rule.moduleName}': 'error'`).join(',')}
      },
    } satisfies Linter.LegacyConfig
  `

  const filepath = join(configsDir, `${name}.ts`)
  await writeFile(filepath, code)

  generatedConfigs.push({
    name: camelCase(name),
    fileName: name,
    path: './' + relative(srcDir, join(configsDir, name)),
  })
}

async function writeFile(filepath: string, code: string) {
  const config = await resolveConfig(filepath)
  const formatted = await format(extname(filepath) === '.md' ? code : jsHeader(code), { ...config, filepath })
  await fs.writeFile(filepath, formatted)
}

async function generateRuleIndex(rules: FoundRule[]) {
  const code = `
    ${rules.map((rule) => `import ${camelCase(rule.moduleName)} from './${rule.moduleName}'`).join('\n')}

    export default {
    ${rules.map((rule) => `'${rule.moduleName}': ${camelCase(rule.moduleName)}`).join(',')}
    }
  `

  const filepath = join(rulesDir, 'index.ts')
  await writeFile(filepath, code)
}

async function generatePluginIndex() {
  const code = `
    import type { ESLint, Linter } from 'eslint'
    ${generatedConfigs.map((config) => `import ${config.name} from '${config.path}'`).join('\n')}
    import rules from './rules/index'

    type Configs = {
      ${generatedConfigs.map((config) => `${config.name}: Linter.Config`).join('\n')}
      ${generatedConfigs.map((config) => `'legacy-${config.fileName}': Linter.LegacyConfig`).join('\n')}
    }

    const plugin: ESLint.Plugin & { rules: typeof rules; configs: Configs } = {
      meta: { name: '@react-three/eslint-plugin' },
      rules,
      configs: {} as Configs,
    }

    /** A flat config (ESLint 9+, or ESLint 8 with eslint.config.js) that registers the plugin itself. */
    const flat = (name: string, legacy: Linter.LegacyConfig): Linter.Config => ({
      name: \`@react-three/\${name}\`,
      plugins: { '@react-three': plugin },
      rules: legacy.rules,
    })

    export const configs: Configs = {
      ${generatedConfigs.map((config) => `${config.name}: flat('${config.fileName}', ${config.name})`).join(',')},
      ${generatedConfigs.map((config) => `'legacy-${config.fileName}': ${config.name}`).join(',')},
    }

    plugin.configs = configs

    export { rules }
    export default plugin
  `

  const filepath = join(srcDir, 'index.ts')
  await writeFile(filepath, code)
}

const conditional = (cond: string, content?: boolean | string) => (content ? cond : '')
const link = (content: string, url?: string) => (url ? `<a href="${url}">${content}</a>` : content)

async function generateReadme(rules: FoundRule[]) {
  const filepath = join(srcDir, '../', 'README.md')
  const readme = await fs.readFile(filepath, 'utf-8')

  const rows: string[] = []

  for (const rule of rules) {
    const docsPath = await ruleDocsPath(rule.moduleName)
    const row = `| ${link(rule.moduleName, docsPath)} | ${rule.module.meta?.docs?.description} | ${conditional(
      '✅',
      Boolean(rule.module.meta?.docs?.recommended),
    )} | ${conditional('🔄', isMigration(rule.module))} | ${conditional('🔧', rule.module.meta?.fixable)} | ${conditional(
      '💡',
      rule.module.meta?.hasSuggestions,
    )} |`

    rows.push(row)
  }

  const code = `
| Rule | Description | ✅ | 🔄 | 🔧 | 💡 |
| ---- | -- | -- | -- | -- | -- |
${rows.join('\n')}
  `

  const found = /<!-- START_RULE_CODEGEN -->(.|\n)*<!-- END_CODEGEN -->/.exec(readme)

  if (!found) {
    throw new Error('invariant')
  }

  const newReadme = readme.replace(
    found[0],
    '<!-- START_RULE_CODEGEN -->' + '\n<!-- @command pnpm codegen:eslint -->' + code + '\n<!-- END_CODEGEN -->',
  )

  await writeFile(filepath, newReadme)
}

async function generate() {
  const rulePaths = (await fs.readdir(rulesDir)).sort()
  const recommended: FoundRule[] = []
  const migration: FoundRule[] = []
  const rules: FoundRule[] = []

  for (const moduleName of rulePaths) {
    if (ignore.includes(moduleName)) {
      continue
    }

    const rule: Rule.RuleModule = (await import(pathToFileURL(join(rulesDir, moduleName)).href)).default
    const foundRule = { module: rule, moduleName: moduleName.replace(extname(moduleName), '') }
    rules.push(foundRule)

    if (rule.meta?.docs?.recommended) {
      recommended.push(foundRule)
    }
    if (isMigration(rule)) {
      migration.push(foundRule)
    }
  }

  await generateRuleIndex(rules)
  await generateConfig('all', rules)
  await generateConfig('migration', migration)
  await generateConfig('recommended', recommended)
  await generatePluginIndex()
  await generateReadme(rules)
}

generate()
