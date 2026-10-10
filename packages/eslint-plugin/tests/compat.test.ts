import { Linter as Linter10 } from 'eslint'
import { Linter as Linter9 } from 'eslint-v9'
import { ESLint as ESLint8, Linter as Linter8 } from 'eslint-v8'
import plugin, { configs, rules } from '../src/index'

const code = `
  import { useFrame } from '@react-three/fiber'
  function Box() {
    const [rotation, setRotation] = useState(0)
    useFrame(() => {
      setRotation(rotation + 1)
      ref.current.position.lerp(new Vector3(), 0.1)
    })
    return <mesh />
  }
`
const languageOptions = {
  ecmaVersion: 2022 as const,
  sourceType: 'module' as const,
  parserOptions: { ecmaFeatures: { jsx: true } },
}
const expected = ['@react-three/no-fast-state', '@react-three/no-new-in-loop']

describe('plugin shape', () => {
  it('exposes every rule through the default export and the named exports', () => {
    expect(plugin.rules).toBe(rules)
    expect(plugin.configs).toBe(configs)
    expect(Object.keys(configs).sort()).toEqual([
      'all',
      'legacy-all',
      'legacy-migration',
      'legacy-recommended',
      'migration',
      'recommended',
    ])
  })

  it('enables every rule in the all configs', () => {
    const names = Object.keys(rules).map((name) => `@react-three/${name}`)
    expect(Object.keys(configs.all.rules!)).toEqual(names)
    expect(Object.keys(configs['legacy-all'].rules!)).toEqual(names)
  })

  it('flat configs register the plugin itself', () => {
    expect(configs.recommended.plugins).toEqual({ '@react-three': plugin })
    expect(configs['legacy-recommended'].plugins).toEqual(['@react-three'])
  })
})

describe.each([
  ['ESLint 10', Linter10],
  ['ESLint 9', Linter9],
  ['ESLint 8', Linter8],
])('%s flat config', (_, Linter) => {
  it('reports with the recommended config', () => {
    const linter = new (Linter as typeof Linter10)({ configType: 'flat' } as never)
    const messages = linter.verify(code, [{ ...configs.recommended, languageOptions }] as never)
    expect(messages.map((message) => message.ruleId)).toEqual(expected)
  })
})

describe('migration config', () => {
  it('reports and fixes v9 code', () => {
    const linter = new Linter10()
    const v9 = `
      import { Canvas, useThree } from '@react-three/fiber/webgpu'
      function Scene() {
        const { gl } = useThree()
        return <Canvas shadows />
      }
    `
    const config = [{ ...configs.migration, languageOptions }]
    const { output, messages } = linter.verifyAndFix(v9, config as never)
    expect(messages).toEqual([])
    expect(output).toContain("from '@react-three/fiber'")
    expect(output).toContain('const { renderer: gl } = useThree()')
    expect(output).toContain('<Canvas renderer={{ shadows: true }} />')
  })
})

describe('ESLint 8 eslintrc config', () => {
  it('reports with the legacy recommended config', async () => {
    const eslint = new ESLint8({
      useEslintrc: false,
      plugins: { '@react-three': plugin },
      overrideConfig: {
        ...configs['legacy-recommended'],
        parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      },
    } as never)
    const [result] = await eslint.lintText(code)
    expect(result.messages.map((message) => message.ruleId)).toEqual(expected)
  })
})
