import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

// Arbitrary classes, including `[@media…]` variants, are cn/no-arbitrary-values' concern.
const calculatedDeclaration =
  /(?:\b(?:width|height|min-width|max-width|min-height|max-height|flex-basis|gap|row-gap|column-gap|grid-template-columns|grid-template-rows|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|inset(?:-[a-z]+)?|top|bottom|left|right)|--[\w-]+)\s*:\s*[^;{}]*\bcalc\(/gi;
const rawResponsive = /@media\b|@container(?:\s+[\w-]+)?\s*(?:\(|style\()/gi;

/** Raw media or container queries, and calculated geometry in CSS declarations. */
export function violations(source: string) {
  const matches = [calculatedDeclaration, rawResponsive].flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[0]),
  );
  return [...new Set(matches)];
}

const rule: TSESLint.RuleModule<'convention' | 'staticStyle'> = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      convention: 'Use named breakpoint variants and flex or grid sizing instead of "{{value}}".',
      staticStyle:
        'Use Tailwind utilities or theme tokens for static styles; reserve inline styles for runtime data.',
    },
  },
  create(context) {
    function check(node: TSESTree.Node, value: string) {
      for (const violation of violations(value)) {
        context.report({ node, messageId: 'convention', data: { value: violation } });
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
      Property(node) {
        let parent: TSESTree.Node | undefined = node.parent;
        while (parent && parent.type !== 'JSXAttribute') {
          if (parent.type === 'CallExpression' || /FunctionExpression$/.test(parent.type)) return;
          parent = parent.parent;
        }
        if (
          parent?.type !== 'JSXAttribute' ||
          parent.name.type !== 'JSXIdentifier' ||
          parent.name.name !== 'style'
        )
          return;
        let value = node.value;
        while (
          value.type === 'TSAsExpression' ||
          value.type === 'TSTypeAssertion' ||
          value.type === 'TSNonNullExpression'
        ) {
          value = value.expression;
        }
        if (
          (value.type === 'Literal' && ['string', 'number'].includes(typeof value.value)) ||
          (value.type === 'TemplateLiteral' && !value.expressions.length) ||
          (value.type === 'UnaryExpression' && value.argument.type === 'Literal')
        ) {
          context.report({ node, messageId: 'staticStyle' });
        }
      },
    };
  },
};

export default rule;
