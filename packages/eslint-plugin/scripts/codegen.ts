import type { Rule } from 'eslint'
import fs from 'fs/promises'
import { join, extname, relative } from 'path'
import { camelCase } from 'lodash'
import { format, resolveConfig } from 'prettier'

const jsHeader = (file: string) =>
  `// THIS FILE WAS GENERATED DO NOT MODIFY BY HAND
// @command yarn codegen:eslint
` + file

interface FoundRule {
  module: Rule.RuleModule
  moduleName: string
}

interface GeneratedConfig {
  name: string
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
    export default {
      plugins: ['@react-three'],
      rules: {
        ${rules.map((rule) => `'@react-three/${rule.moduleName}': 'error'`).join(',')}
      },
    }
  `

  const filepath = join(configsDir, `${name}.ts`)
  await writeFile(filepath, code)

  generatedConfigs.push({ name: camelCase(name), path: './' + relative(srcDir, join(configsDir, name)) })
}

async function writeFile(filepath: string, code: string) {
  const config = await resolveConfig(filepath)
  await fs.writeFile(filepath, format(extname(filepath) === '.md' ? code : jsHeader(code), { ...config, filepath }))
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
    ${generatedConfigs.map((config) => `import ${config.name} from '${config.path}'`).join('\n')}

    export { default as rules } from './rules/index'

    export const configs = {
      ${generatedConfigs.map((config) => `${config.name}`).join(',')}
    }
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
      rule.module.meta?.docs?.recommended,
    )} | ${conditional('🔧', rule.module.meta?.fixable)} | ${conditional('💡', rule.module.meta?.hasSuggestions)} |`

    rows.push(row)
  }

  const code = `
| Rule | Description | ✅ | 🔧 | 💡 | 
| ---- | -- | -- | -- | -- |
${rows.join('\n')}
  `

  const found = /<!-- START_RULE_CODEGEN -->(.|\n)*<!-- END_CODEGEN -->/.exec(readme)

  if (!found) {
    throw new Error('invariant')
  }

  const newReadme = readme.replace(
    found[0],
    '<!-- START_RULE_CODEGEN -->' + '\n<!-- @command yarn codegen:eslint -->' + code + '\n<!-- END_CODEGEN -->',
  )

  await writeFile(filepath, newReadme)
}

async function generate() {
  const rulePaths = await fs.readdir(rulesDir)
  const recommended: FoundRule[] = []
  const rules: FoundRule[] = []

  for (const moduleName of rulePaths) {
    if (ignore.includes(moduleName)) {
      continue
    }

    const rule: Rule.RuleModule = (await import(join(rulesDir, moduleName))).default
    const foundRule = { module: rule, moduleName: moduleName.replace(extname(moduleName), '') }
    rules.push(foundRule)

    if (rule.meta?.docs?.recommended) {
      recommended.push(foundRule)
    }
  }

  await generateRuleIndex(rules)
  await generateConfig('all', rules)
  await generateConfig('recommended', recommended)
  await generatePluginIndex()
  await generateReadme(rules)
}

generate()
