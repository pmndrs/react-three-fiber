/**
 * The branch the rule docs are read from. The plugin's 1.x line is developed on `v10`; switch this to
 * `master` when v10 is merged there, or the links point at a branch that no longer moves.
 */
const DOCS_REF = 'v10'

export function gitHubUrl(name: string) {
  return `https://github.com/pmndrs/react-three-fiber/blob/${DOCS_REF}/packages/eslint-plugin/docs/rules/${name}.md`
}
