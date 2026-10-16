import type { TSESLint } from '@typescript-eslint/utils';

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      javascript: 'Write scripts and configuration in TypeScript; rename this file to .ts or .tsx.',
    },
  },
  create(context) {
    return {
      Program(node) {
        context.report({ node, messageId: 'javascript' });
      },
    };
  },
} satisfies TSESLint.RuleModule<'javascript'>;
