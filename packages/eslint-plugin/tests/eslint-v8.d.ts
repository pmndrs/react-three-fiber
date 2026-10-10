// eslint@8 ships no types; the compat test only uses the parts of the API that 8 shares with 10.
declare module 'eslint-v8' {
  export { ESLint, Linter } from 'eslint'
}
