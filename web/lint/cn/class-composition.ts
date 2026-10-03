import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

import { classContext, maxClassGroupLength } from './cn-context.ts';

function splitGroups(value: string, maxLength: number) {
  const groups = [];
  for (const line of value.trim().split(/\r?\n/)) {
    let group = '';
    for (const utility of line.trim().split(/\s+/).filter(Boolean)) {
      if (group && group.length + utility.length + 1 > maxLength) {
        groups.push(group);
        group = '';
      }
      if (group) group += ' ';
      group += utility;
    }
    if (group) groups.push(group);
  }
  return groups;
}

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: { maxLength: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      length: 'Split class groups into cn() arguments of at most {{maxLength}} characters.',
      newline: 'Keep each class group in its own string instead of embedding line breaks.',
      composition:
        'Compose conditional styles with cn() condition objects and separate class variables.',
    },
  },
  create(context) {
    const { isCnCall, isClassValue, isOtherComposer } = classContext(context);
    const maxLength = context.options[0]?.maxLength ?? maxClassGroupLength;

    function checkGroup(node: TSESTree.Node, value: string) {
      if (!isClassValue(node)) return;
      const words = value.trim().split(/\s+/);
      const multiline = /[\r\n]/.test(value);
      if (!value.trim() || (!multiline && (words.length < 2 || value.length <= maxLength))) return;
      const parent = node.parent;
      const directArgument = parent?.type === 'CallExpression' && isCnCall(parent);
      const before = context.sourceCode.getTokenBefore(node);
      let callOpening: TSESTree.Token | null | undefined;
      if (directArgument) {
        callOpening = context.sourceCode.getTokenAfter(parent.callee, {
          filter: (token) => token.value === '(',
        });
      }
      const parenthesized = before?.value === '(' && before.range[0] !== callOpening?.range[0];
      let messageId: 'newline' | 'length' = 'length';
      if (multiline) messageId = 'newline';
      let fix: TSESLint.ReportFixFunction | undefined;
      if (directArgument && !parenthesized) {
        fix = (fixer) => {
          const groups = splitGroups(value, maxLength);
          const argumentsSource = groups.map((group) => JSON.stringify(group)).join(',\n');
          return fixer.replaceText(node, argumentsSource);
        };
      }
      context.report({
        node,
        messageId,
        data: { maxLength },
        fix,
      });
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkGroup(node, node.value);
      },
      ConditionalExpression(node) {
        if (isClassValue(node)) context.report({ node, messageId: 'composition' });
      },
      LogicalExpression(node) {
        if (isClassValue(node)) context.report({ node, messageId: 'composition' });
      },
      TemplateLiteral(node) {
        if (!isClassValue(node)) return;
        if (node.expressions.length) context.report({ node, messageId: 'composition' });
        else checkGroup(node, node.quasis[0].value.cooked ?? node.quasis[0].value.raw);
      },
      BinaryExpression(node) {
        if (node.operator === '+' && isClassValue(node)) {
          context.report({ node, messageId: 'composition' });
        }
      },
      CallExpression(node) {
        if (
          isClassValue(node) &&
          !isCnCall(node) &&
          (isOtherComposer(node) ||
            (node.callee.type === 'MemberExpression' &&
              !node.callee.computed &&
              (node.callee.property.type === 'Identifier' ||
                node.callee.property.type === 'PrivateIdentifier') &&
              node.callee.property.name === 'join'))
        ) {
          context.report({ node, messageId: 'composition' });
        }
      },
    };
  },
} satisfies TSESLint.RuleModule<'length' | 'newline' | 'composition', [{ maxLength?: number }?]>;
