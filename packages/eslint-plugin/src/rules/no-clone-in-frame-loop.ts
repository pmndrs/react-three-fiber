import type { Rule } from 'eslint'

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      recommended: false,
    },
  },
  create() {
    return {}
  },
}

export default rule
