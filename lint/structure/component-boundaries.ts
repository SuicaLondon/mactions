import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

type Kind = 'component' | 'hook' | 'store';

const locations = {
  component: { folder: 'components', label: 'Component' },
  hook: { folder: 'hooks', label: 'Custom hook' },
  store: { folder: 'stores', label: 'Store' },
} satisfies Record<Kind, { folder: string; label: string }>;

// Zustand stores are created with create(...) or the curried create<State>()(...).
function isStoreCreation(init: TSESTree.Expression): boolean {
  if (init.type !== 'CallExpression') return false;
  if (init.callee.type === 'Identifier') return init.callee.name === 'create';
  return init.callee.type === 'CallExpression' && isStoreCreation(init.callee);
}

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      multiple:
        'Keep one component, custom hook, or store per file, exported or not. Move {{names}} into separate files.',
      location: 'Place {{kind}} files in a {{folder}} directory, separate from other categories.',
      nested:
        'Declare components, custom hooks, and stores at module scope to preserve their identity.',
    },
  },
  create(context) {
    const declarations: { node: TSESTree.Node; name: string; kind: Kind }[] = [];
    function record(node: TSESTree.Node, name: string, store = false) {
      let kind: Kind = 'component';
      if (store) kind = 'store';
      else if (/^use[A-Z]/.test(name)) kind = 'hook';
      else if (!/^[A-Z]/.test(name)) return;
      let parent = node.parent;
      while (parent && parent.type !== 'Program') {
        if (
          parent.type === 'FunctionDeclaration' ||
          parent.type === 'FunctionExpression' ||
          parent.type === 'ArrowFunctionExpression'
        ) {
          context.report({ node, messageId: 'nested' });
          return;
        }
        parent = parent.parent;
      }
      declarations.push({ node, name, kind });
    }
    return {
      // Named declarations, including `export default function View`, are recorded where they are
      // declared; only anonymous default exports need their own entry.
      ExportDefaultDeclaration(node) {
        const declaration = node.declaration;
        if (
          declaration.type === 'ArrowFunctionExpression' ||
          (declaration.type === 'FunctionDeclaration' && !declaration.id) ||
          declaration.type === 'CallExpression'
        ) {
          record(node, 'DefaultComponent');
        }
      },
      FunctionDeclaration(node) {
        if (node.id) record(node, node.id.name);
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init) return;
        const init = node.init;
        if (isStoreCreation(init)) {
          record(node, node.id.name, true);
          return;
        }
        if (
          init.type === 'ArrowFunctionExpression' ||
          init.type === 'FunctionExpression' ||
          (init.type === 'CallExpression' &&
            ((init.callee.type === 'Identifier' &&
              ['memo', 'forwardRef', 'lazy'].includes(init.callee.name)) ||
              (init.callee.type === 'MemberExpression' &&
                !init.callee.computed &&
                init.callee.property.type === 'Identifier' &&
                ['memo', 'forwardRef', 'lazy'].includes(init.callee.property.name))))
        ) {
          record(node, node.id.name);
        }
      },
      'Program:exit'() {
        // Every declaration counts, private ones included: a second component gets its own file.
        if (declarations.length > 1) {
          context.report({
            node: declarations[1].node,
            messageId: 'multiple',
            data: { names: declarations.map(({ name }) => name).join(', ') },
          });
        }
        const filename = context.filename.replaceAll('\\', '/');
        for (const { node, kind } of declarations) {
          const { folder, label } = locations[kind];
          // Shared UI is already grouped by control, icon, or loading responsibility.
          if (kind === 'component' && filename.includes('/shared/ui/')) continue;
          if (!filename.includes(`/${folder}/`)) {
            context.report({ node, messageId: 'location', data: { kind: label, folder } });
          }
        }
      },
    };
  },
} satisfies TSESLint.RuleModule<'multiple' | 'location' | 'nested'>;
