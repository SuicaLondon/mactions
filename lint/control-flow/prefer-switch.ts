import type { TSESLint } from '@typescript-eslint/utils';

export const maxConditionalBranches = 4;

export default {
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: { maxBranches: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      preferSwitch:
        'Use switch for an if / else if chain with {{count}} conditional branches; the limit is {{maxBranches}}. A final else does not count.',
    },
  },
  create(context) {
    const maxBranches = context.options[0]?.maxBranches ?? maxConditionalBranches;

    return {
      IfStatement(node) {
        if (node.parent.type === 'IfStatement' && node.parent.alternate === node) return;

        let count = 1;
        let alternate = node.alternate;
        while (alternate?.type === 'IfStatement') {
          count += 1;
          alternate = alternate.alternate;
        }

        if (count > maxBranches) {
          context.report({
            node,
            messageId: 'preferSwitch',
            data: { count, maxBranches },
          });
        }
      },
    };
  },
} satisfies TSESLint.RuleModule<'preferSwitch', [{ maxBranches?: number }?]>;
