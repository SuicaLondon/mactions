import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      multiple: 'Keep one component or custom hook per file. Move {{names}} into separate files.',
      location: 'Place {{kind}} files in a {{folder}} directory, separate from other categories.',
      nested: 'Declare components and custom hooks at module scope to preserve their identity.',
    },
  },
  create(context) {
    const declarations: { node: TSESTree.Node; name: string; hook: boolean }[] = [];
    function record(node: TSESTree.Node, name: string) {
      const hook = /^use[A-Z]/.test(name);
      if (!hook && !/^[A-Z]/.test(name)) return;
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
      declarations.push({ node, name, hook });
    }
    return {
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
        if (declarations.length > 1) {
          context.report({
            node: declarations[1].node,
            messageId: 'multiple',
            data: { names: declarations.map(({ name }) => name).join(', ') },
          });
        }
        const filename = context.filename.replaceAll('\\', '/');
        for (const { node, hook } of declarations) {
          let folder = 'components';
          let kind = 'Component';
          if (hook) {
            folder = 'hooks';
            kind = 'Custom hook';
          }
          // Shared UI is already grouped by control, icon, or loading responsibility.
          if (!hook && filename.includes('/shared/ui/')) continue;
          if (!filename.includes(`/${folder}/`)) {
            context.report({ node, messageId: 'location', data: { kind, folder } });
          }
        }
      },
    };
  },
} satisfies TSESLint.RuleModule<'multiple' | 'location' | 'nested'>;
