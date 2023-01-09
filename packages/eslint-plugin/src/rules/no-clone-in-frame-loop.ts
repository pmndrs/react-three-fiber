import type { Rule } from 'eslint'

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      recommended: false,
      description: 'Disallow `.clone()` inside frame loops.',
    },
  },
  create() {
    return {}
  },
}

export default rule
