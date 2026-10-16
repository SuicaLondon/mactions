import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

export const classFunctions = ['cn', 'classNames'];
export const maxClassGroupLength = 80;

function isCnModule(source: string) {
  return source === 'cn' || /(?:^|\/)cn(?:\.[cm]?[jt]s)?$/.test(source);
}

function propertyName(node: TSESTree.Property['key']) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return String(node.value ?? '');
  return '';
}

export function classContext(context: Readonly<{ sourceCode: TSESLint.SourceCode }>) {
  function binding(node: TSESTree.Node, name: string) {
    for (
      let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
      scope;
      scope = scope.upper
    ) {
      const variable = scope.set.get(name);
      if (variable) return variable;
    }
    return undefined;
  }

  function isCnCall(node: TSESTree.Node | undefined) {
    if (node?.type !== 'CallExpression') return false;
    const callee = node.callee;
    if (callee.type === 'Identifier') {
      const variable = binding(node, callee.name);
      if (!variable?.defs.length) return classFunctions.includes(callee.name);
      return variable.defs.some(
        (definition) =>
          definition.type === 'ImportBinding' &&
          definition.node.type === 'ImportSpecifier' &&
          definition.node.imported.type === 'Identifier' &&
          definition.node.imported.name === 'cn' &&
          definition.parent.type === 'ImportDeclaration' &&
          isCnModule(definition.parent.source.value),
      );
    }
    if (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'cn'
    ) {
      return (
        binding(node, callee.object.name)?.defs.some(
          (definition) =>
            definition.type === 'ImportBinding' &&
            definition.node.type === 'ImportNamespaceSpecifier' &&
            definition.parent.type === 'ImportDeclaration' &&
            isCnModule(definition.parent.source.value),
        ) ?? false
      );
    }
    return false;
  }

  function isCnArgument(node: TSESTree.Node) {
    let child = node;
    while (
      child.parent &&
      [
        'ArrayExpression',
        'SpreadElement',
        'TSAsExpression',
        'TSTypeAssertion',
        'TSNonNullExpression',
        'TSSatisfiesExpression',
      ].includes(child.parent.type)
    )
      child = child.parent;
    const parent = child.parent;
    return (
      parent?.type === 'CallExpression' &&
      isCnCall(parent) &&
      parent.arguments.some((argument) => argument === child)
    );
  }

  function isConditionObject(node: TSESTree.Node) {
    for (let owner: TSESTree.Node | undefined = node; owner; owner = owner.parent) {
      if (owner.type === 'CallExpression') return isCnCall(owner);
      if (owner.type === 'VariableDeclarator') {
        if (owner.id.type !== 'Identifier') return false;
        return (
          binding(owner, owner.id.name)?.references.some(({ identifier }) =>
            isCnArgument(identifier),
          ) ?? false
        );
      }
      if (/FunctionExpression$/.test(owner.type)) return false;
    }
    return false;
  }

  function isClassValue(node: TSESTree.Node) {
    for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
      if (parent.type === 'Property') {
        const condition = isConditionObject(parent.parent);
        if (child === parent.value && condition) return false;
        if (child === parent.key && !condition) return false;
        if (child === parent.value && propertyName(parent.key) === 'style') return false;
        if (
          child === parent.value &&
          parent.parent.parent?.type === 'Property' &&
          !/(?:^className$|ClassName$)/.test(propertyName(parent.key))
        )
          return false;
      }
      if (parent.type === 'ConditionalExpression' && child === parent.test) return false;
      if (parent.type === 'BinaryExpression' && parent.operator !== '+') return false;
      if (parent.type === 'MemberExpression') return false;
      if (parent.type === 'CallExpression') {
        return isCnCall(parent) && parent.arguments.some((argument) => argument === child);
      }
      if (parent.type === 'JSXAttribute')
        return (
          parent.name.type === 'JSXIdentifier' &&
          /(?:^className$|ClassName$)/.test(parent.name.name)
        );
      if (parent.type === 'VariableDeclarator') {
        return (
          parent.id.type === 'Identifier' &&
          /(?:[Cc]lasses|[Cc]lassName|Layout|[Vv]ariants)$/.test(parent.id.name)
        );
      }
      if (parent.type === 'AssignmentPattern')
        return (
          parent.left.type === 'Identifier' && /(?:^className$|ClassName$)/.test(parent.left.name)
        );
      if (
        /^(?:ArrowFunctionExpression|FunctionExpression|FunctionDeclaration)$/.test(parent.type)
      ) {
        return false;
      }
    }
    return false;
  }

  function isOtherComposer(node: TSESTree.CallExpression) {
    if (node.callee.type !== 'Identifier') return false;
    const variable = binding(node, node.callee.name);
    if (!variable?.defs.length)
      return ['clsx', 'classnames', 'classNames'].includes(node.callee.name);
    return variable.defs.some(
      (definition) =>
        definition.type === 'ImportBinding' &&
        definition.parent.type === 'ImportDeclaration' &&
        ['clsx', 'classnames'].includes(definition.parent.source.value),
    );
  }

  return { isCnCall, isClassValue, isOtherComposer };
}
