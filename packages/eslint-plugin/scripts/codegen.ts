import type { Rule } from 'eslint'
import fs from 'fs/promises'
import { join, extname, relative } from 'path'
import { camelCase } from 'lodash'
import { format, resolveConfig } from 'prettier'

const jsHeader = (file: string) =>
  `// THIS FILE WAS GENERATED DO NOT MODIFY BY HAND
// @command yarn codegen:eslint
` + file

const mdHeader = (file: string) =>
  `<!--- THIS FILE WAS GENERATED DO NOT MODIFY BY HAND -->
<!--- @command yarn codegen:eslint -->
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
  await fs.writeFile(
    filepath,
    format(extname(filepath) === '.md' ? mdHeader(code) : jsHeader(code), { ...config, filepath }),
  )
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
  const code = `
# @react-three/eslint-plugin

[![Version](https://img.shields.io/npm/v/@react-three/eslint-plugin?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/eslint-plugin)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

An ESLint plugin which provides lint rules for [@react-three/fiber](https://github.com/pmndrs/react-three-fiber).

## Installation

\`\`\`bash
npm install @react-three/eslint-plugin --save-dev
\`\`\`

## Configuration

Use the recommended [config](#recommended) to get reasonable defaults:

\`\`\`json
"extends": [
  "plugin:@react-three/recommended"
]
\`\`\`

If you do not use a config you will need to specify individual rules and add extra configuration.

Add "@react-three" to the plugins section.

\`\`\`json
"plugins": [
  "@react-three"
]
\`\`\`

Enable the rules that you would like to use.

\`\`\`json
"rules": {
  "@react-three/no-clone-in-frame-loop": "error"
}
\`\`\`

## Rules

✅ Enabled in the \`recommended\` [configuration](#recommended).<br>
🔧 Automatically fixable by the \`--fix\` [CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).<br>
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

| Rule | Description | ✅ | 🔧 | 💡 | 
| ---- | -- | -- | -- | -- |
${rules
  .map(
    (rule) =>
      `| ${link(rule.moduleName, rule.module.meta?.docs?.url)} | ${rule.module.meta?.docs?.description} | ${conditional(
        '✅',
        rule.module.meta?.docs?.recommended,
      )} | ${conditional('🔧', rule.module.meta?.fixable)} | ${conditional('💡', rule.module.meta?.hasSuggestions)} |`,
  )
  .join('\n')}

## Shareable configs

<!-- This part of the readme is not currently codegen'd. If you add more configs make sure to update this. -->

### Recommended

This plugin exports a \`recommended\` configuration that enforces rules appropriate for everyone using React Three Fiber.

\`\`\`json
"extends": [
  "plugin:@react-three/recommended"
]
\`\`\`

### All

This plugin also exports an \`all\` configuration that includes every available rule.

\`\`\`json
"extends": [
  "plugin:@react-three/all"
]
\`\`\`
  `

  const filepath = join(srcDir, '../', 'README.md')
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
  await generateReadme(rules)
}

generate()
