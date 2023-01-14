import type { Rule } from 'eslint'

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      recommended: true,
      description: 'Disallow creating objects in loops causing the garbage collector to do more work than necessary.',
    },
  },
  create() {
    return {}
  },
}

export default rule
