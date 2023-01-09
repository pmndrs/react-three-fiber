import type { Rule } from 'eslint'
import fs from 'fs/promises'
import { join, extname, relative } from 'path'
import { camelCase } from 'lodash'
import { format, resolveConfig } from 'prettier'

const header = (file: string) =>
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
const rulesDir = join(srcDir, 'rules')
const configsDir = join(srcDir, 'configs')
const generatedConfigs: GeneratedConfig[] = []

async function generateConfig(name: string, rules: FoundRule[]) {
  const code = `
    export default {
      plugins: ['@react-three'],
      rules: {
        ${rules.map((rule) => `'@react-three/${rule.moduleName}': 'error'`)}
      },
    }
  `

  const filepath = join(configsDir, `${name}.ts`)
  await writeFile(filepath, code)

  generatedConfigs.push({ name: camelCase(name), path: './' + relative(srcDir, join(configsDir, name)) })
}

async function writeFile(filepath: string, code: string) {
  const config = await resolveConfig(filepath)
  await fs.writeFile(filepath, format(header(code), { ...config, filepath }))
}

async function generateRuleIndex(rules: FoundRule[]) {
  const code = `
    ${rules.map((rule) => `import ${camelCase(rule.moduleName)} from './${rule.moduleName}'`)}

    export default {
    ${rules.map((rule) => `'${rule.moduleName}': ${camelCase(rule.moduleName)}`)}
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
      ${generatedConfigs.map((config) => `${config.name},`).join('\n')}
    }
  `

  const filepath = join(srcDir, 'index.ts')
  await writeFile(filepath, code)
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
}

generate()
