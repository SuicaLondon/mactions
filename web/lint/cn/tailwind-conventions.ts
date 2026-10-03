const arbitrarySpacing =
  /\b(?:size|w|h|min-w|max-w|min-h|max-h|basis|gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?|inset(?:-[xyse])?|top|bottom|left|right|start|end|scroll-[mp][trblxyse]?)-\[[^\]]+\]/g;
const calculatedUtility = /\b[a-z][a-z-]*-\[[^\]]*\bcalc\([^\]]*\]/gi;
const calculatedDeclaration =
  /(?:\b(?:width|height|min-width|max-width|min-height|max-height|flex-basis|gap|row-gap|column-gap|grid-template-columns|grid-template-rows|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|inset(?:-[a-z]+)?|top|bottom|left|right)|--[\w-]+)\s*:\s*[^;{}]*\bcalc\(/gi;
const arbitraryDesign =
  /\b(?:flex|rounded(?:-[a-z]+)?|shadow|inset-shadow|text|leading|opacity|z|outline|bg|border(?:-[a-z]+)?)-\[[^\]]+\]|(?:min|max)-\[[^\]]+\]/g;
const arbitraryProperty = /\[(?!-)[a-z][a-z-]*:[^\]]+\]/g;
const arbitraryNumeric = /\b[a-z][a-z-]*-\[-?\d+(?:\.\d+)?(?:px|rem|%|dvh|vw)?\]/g;
const hardCodedGeometry =
  /\b(?:grid-cols|grid-rows|size|w|h|min-w|max-w|min-h|max-h|basis|gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?|inset(?:-[xyse])?|top|bottom|left|right|start|end|scroll-[mp][trblxyse]?)-\[[^\]]*\d(?:px|rem|em)[^\]]*\]/g;
const rawResponsive =
  /\[@(?:media|container)[^\]]*\]|@media\b|@container(?:\s+[\w-]+)?\s*(?:\(|style\()/gi;
const arbitraryVariant = /\[(?:[^[\]]|\[[^[\]]*\])+\](?=:)/g;

export function violations(source: string, includeSelectorVariants = true) {
  const patterns = [
    arbitrarySpacing,
    calculatedUtility,
    calculatedDeclaration,
    arbitraryDesign,
    arbitraryNumeric,
    arbitraryProperty,
    hardCodedGeometry,
    rawResponsive,
  ];
  if (includeSelectorVariants) patterns.push(arbitraryVariant);
  const matches = [
    ...new Set(
      patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[0])),
    ),
  ];
  return matches.filter(
    (value) => !matches.some((other) => other !== value && other.includes(value)),
  );
}

const rule: TSESLint.RuleModule<'convention' | 'staticStyle'> = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      convention:
        'Use Tailwind standard utilities and named variants on the styled element instead of "{{value}}".',
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
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
