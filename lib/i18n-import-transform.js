const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

function i18nImportAstTransform(ast, importName, importPath) {
  let hasI18nImport = false;
  let lastImportNode = null;
  let needTransform = false;
  let conflictDefined = false;

  if (importName.includes(".")) {
    importName = importName.split(".")[0];
  }

  traverse(ast, {
    ImportDeclaration(path) {
      lastImportNode = path.node;

      const sourcePath = path.node.source.value;

      // 判断是否有 import { $t } from '@/i18n' 或 import $t from '@/i18n'
      const existImport = path.node.specifiers.some(
        spec =>
          (t.isImportSpecifier(spec) || t.isImportDefaultSpecifier(spec)) &&
          spec.local.name === importName
      );

      // 判断是否是其它路径导入了 $t
      const importedElsewhere = sourcePath !== importPath && existImport;

      if (importedElsewhere) {
        conflictDefined = true;
        path.stop();
        return;
      }

      // 检查是否已经导入目标路径
      if (sourcePath === importPath) {
        hasI18nImport = true;

        if (existImport) return;

        // 添加 $t 到已有的 import
        path.node.specifiers.push(
          t.importSpecifier(t.identifier(importName), t.identifier(importName))
        );

        needTransform = true;
      }
    },
    VariableDeclarator(path) {
      if (t.isIdentifier(path.node.id) && path.node.id.name === importName) {
        conflictDefined = true;
        path.stop();
      }
    },

    FunctionDeclaration(path) {
      if (t.isIdentifier(path.node.id) && path.node.id.name === importName) {
        conflictDefined = true;
        path.stop();
      }
    }
  });

  if (conflictDefined) {
    return {
      ast,
      needTransform: false
    };
  }

  if (!hasI18nImport) {
    const importNode = t.importDeclaration(
      [
        // t.importDefaultSpecifier(t.identifier("i18n")),
        t.importSpecifier(t.identifier(importName), t.identifier(importName))
      ],
      t.stringLiteral(importPath)
    );

    const program = ast.program ? ast.program : ast;

    if (lastImportNode) {
      program.body.splice(
        program.body.indexOf(lastImportNode) + 1,
        0,
        importNode
      );
    } else {
      program.body.unshift(importNode);
    }

    needTransform = true;
  }

  return {
    ast,
    needTransform
  };
}

function getImportNames(options) {
  return [
    options.translateKey,
    options.jsx && options.JSXElement,
    options.injectHooks && options.hooksIdentifier
  ].filter(Boolean);
}

function babelI18nImportTransform(path, ast, options) {
  if (this.__runInBabelPlugin && !this.__enabled) {
    path.stop?.();
    return false;
  }

  const importNames = getImportNames(options);

  for (const importName of importNames) {
    i18nImportAstTransform(ast, importName, options.i18nPkgImportPath);
  }

  return true;
}

module.exports = {
  i18nImportAstTransform,
  babelI18nImportTransform
};
