import { RuleTester } from 'eslint'

/** A RuleTester for modern JSX modules, on the flat config used by ESLint 9 and later. */
export const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})
