import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

import { classContext } from './cn-context.ts';

export type ArbitraryKind = 'value' | 'property' | 'variant' | 'modifier';

export interface ArbitraryClass {
  /** The class as written, with its variants. */
  className: string;
  kind: ArbitraryKind;
  /** Where the class starts in the checked text. */
  index: number;
  /** The theme utility with the same value, when one can be derived. */
  replacement?: string;
}

const boxSides = ['', 'x', 'y', 's', 'e', 't', 'r', 'b', 'l'];
const margins = ['m', 'scroll-m'].flatMap((box) => boxSides.map((side) => box + side));
const insets = ['inset', 'inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'];
const translates = ['translate', 'translate-x', 'translate-y'];
// Utilities whose numbers are multiples of the theme `--spacing` step and may be negative.
const negativeSpacing = new Set([...margins, ...insets, ...translates, 'space-x', 'space-y']);
const sizes = ['w', 'min-w', 'max-w', 'h', 'min-h', 'max-h', 'size', 'basis'];
// Every utility whose numbers are multiples of the theme `--spacing` step, such as `h-5`.
const spacingUtilities = new Set([
  ...negativeSpacing,
  ...['p', 'scroll-p'].flatMap((box) => boxSides.map((side) => box + side)),
  ...['gap', 'gap-x', 'gap-y', 'indent', 'leading', 'border-spacing'],
  ...sizes,
]);
const fullUtilities = new Set([...sizes, ...insets, ...translates]);

// `p-[2px]`, `bg-(--brand)`, `max-[45rem]:`, and `@max-[36rem]/panel:` alike.
const arbitraryValue = /^@?[a-z][a-z0-9-]*-[[(]/;
// `bg-accent/[0.3]` and `text-sm/(--leading)`; the dash keeps paths such as `src/(group)` out.
const arbitraryModifier = /^[a-z][a-z0-9]*-[\w.-]*\/[[(]/;
const spacingLength = /^(-?)(\d*\.?\d+)(px|rem)$|^(0)$/;

/** Splits a class into its variants and utility at colons outside brackets and parentheses. */
function splitClass(className: string) {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < className.length; index++) {
    const char = className[index];
    if (char === '[' || char === '(') depth++;
    else if ((char === ']' || char === ')') && depth) depth--;
    else if (char === ':' && !depth) {
      variants.push(className.slice(start, index));
      start = index + 1;
    }
  }
  return { variants, utility: className.slice(start) };
}

/**
 * Class strings report every bracket or parenthesis. Other strings report only shapes that
 * cannot be prose or CSS selectors, so `[data-row]:hover` or `[INFO:main]` pass there.
 */
function arbitraryKind(className: string, classString: boolean): ArbitraryKind | undefined {
  const { variants, utility } = splitClass(className);
  const bare = utility.replace(/^!|!$/g, '').replace(/^-/, '');
  if (classString && bare.startsWith('[')) return 'property';
  if (arbitraryValue.test(bare)) return 'value';
  if (arbitraryModifier.test(bare)) return 'modifier';
  const variant = variants.some((value) => {
    if (classString) return /[[(]/.test(value);
    return arbitraryValue.test(value) || /^\[(?:@|.*&)/.test(value);
  });
  if (variant) return 'variant';
  if (classString && /[[\]()]/.test(bare)) return 'value';
  return undefined;
}

function spacingStep(value: string) {
  const length = spacingLength.exec(value);
  if (!length) return undefined;
  if (length[4]) return { negative: false, step: '0' };
  // The theme step is 0.25rem: 4px at the default root size.
  let steps = Number(length[2]) * 4;
  if (length[3] === 'px') steps = Number(length[2]) / 4;
  if (!Number.isInteger(steps * 4)) return undefined;
  if (!steps) return { negative: false, step: '0' };
  let step = String(steps);
  if (length[3] === 'px' && steps === 0.25) step = 'px';
  return { negative: length[1] === '-', step };
}

/** Maps `h-[20px]` to `h-5` and `w-[100%]` to `w-full`; other values have no exact match. */
function themeReplacement(className: string) {
  const { variants, utility } = splitClass(className);
  const match = /^(!?)(-?)([a-z][a-z0-9-]*?)-\[([^\]]+)\](!?)$/.exec(utility);
  if (!match) return undefined;
  const [, leadingImportant, negative, root, value, trailingImportant] = match;
  let name: string | undefined;
  let sign = negative;
  if (value === '100%' && fullUtilities.has(root)) name = 'full';
  else if (spacingUtilities.has(root)) {
    const length = spacingStep(value);
    if (length) {
      name = length.step;
      // `-top-[-4px]` flips back to a positive step.
      if (length.negative && sign) sign = '';
      else if (length.negative) sign = '-';
    }
  }
  if (!name) return undefined;
  if (name === '0') sign = '';
  if (sign && !negativeSpacing.has(root)) return undefined;
  const replacement = `${leadingImportant}${sign}${root}-${name}${trailingImportant}`;
  return [...variants, replacement].join(':');
}

/**
 * Finds Tailwind classes that use arbitrary syntax: `[...]` values, properties, and variants,
 * and `(--name)` shorthands. `classString` marks text known to hold only classes.
 */
export function arbitraryClasses(text: string, classString = true): ArbitraryClass[] {
  const found: ArbitraryClass[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const className = match[0];
    const kind = arbitraryKind(className, classString);
    if (!kind) continue;
    let replacement: string | undefined;
    if (kind === 'value') replacement = themeReplacement(className);
    found.push({ className, kind, index: match.index, replacement });
  }
  return found;
}

type MessageId = ArbitraryKind | 'spacing' | 'replace';

const rule: TSESLint.RuleModule<MessageId, []> = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    schema: [],
    messages: {
      value:
        '"{{className}}" uses an arbitrary value. Use a theme utility, or add a named token to src/styles/theme.css.',
      spacing: 'Use "{{replacement}}" instead of the arbitrary value "{{className}}".',
      property:
        '"{{className}}" is an arbitrary property. Use a theme utility, or register an @utility in src/styles/.',
      variant:
        '"{{className}}" uses an arbitrary variant. Use a named variant, or put the class on the element it styles.',
      modifier: '"{{className}}" uses an arbitrary modifier. Use a numeric modifier such as "/30".',
      replace: 'Replace with "{{replacement}}".',
    },
  },
  create(context) {
    const { isClassValue } = classContext(context);

    /**
     * Checks a string's source between its quotes. `masked` has the same length, with escaped
     * whitespace as spaces and template expressions filled in, so each class stays one token
     * and its offsets still point at the source.
     */
    function check(node: TSESTree.Node, masked: string, strict: boolean) {
      const start = node.range[0] + 1;
      const source = context.sourceCode.text;
      for (const found of arbitraryClasses(masked.replace(/\\[nrtfv]/g, '  '), strict)) {
        const range: [number, number] = [
          start + found.index,
          start + found.index + found.className.length,
        ];
        const className = source.slice(...range);
        const loc = {
          start: context.sourceCode.getLocFromIndex(range[0]),
          end: context.sourceCode.getLocFromIndex(range[1]),
        };
        const replacement = found.replacement;
        if (!replacement) {
          context.report({ node, loc, messageId: found.kind, data: { className } });
          continue;
        }
        const data = { className, replacement };
        context.report({
          node,
          loc,
          messageId: 'spacing',
          data,
          suggest: [
            {
              messageId: 'replace',
              data,
              fix: (fixer) => fixer.replaceTextRange(range, replacement),
            },
          ],
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        check(node, context.sourceCode.getText(node).slice(1, -1), isClassValue(node));
      },
      // Whole template literals, so `h-[${size}px]` is one class rather than two fragments.
      TemplateLiteral(node) {
        let masked = context.sourceCode.getText(node);
        for (const expression of node.expressions) {
          const from = expression.range[0] - node.range[0];
          const to = expression.range[1] - node.range[0];
          masked = masked.slice(0, from) + 'x'.repeat(to - from) + masked.slice(to);
        }
        check(node, masked.slice(1, -1), isClassValue(node));
      },
    };
  },
};

export default rule;
