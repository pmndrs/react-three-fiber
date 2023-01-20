import type { Rule } from 'eslint'
import { gitHubUrl } from '../lib/url'

const rule: Rule.RuleModule = {
  meta: {
    messages: {},
    docs: {
      url: gitHubUrl('no-fast-state'),
      recommended: true,
      description: 'Disallow setting state too quickly which can cause performance problems.',
    },
  },
  create() {
    return {}
  },
}

export default rule
