const t = require("@babel/types");

function i18nImportAstTransform(programPath, importName, importPath) {
  let hasI18nImport = false;
  let conflictDefined = false;
  let needTransform = false;
  let lastImportPath = null;

  // importName 可能是 this.$t 这种
  if (importName.includes(".")) {
    importName = importName.split(".")[0];
  }

  programPath.traverse({
    ImportDeclaration(path) {
      lastImportPath = path;

      const sourcePath = path.node.source.value;

      // 判断是否有 import { $t } from '@/i18n' 或 import $t from '@/i18n'
      const existImport = path.node.specifiers.some(
        spec =>
          (t.isImportSpecifier(spec) || t.isImportDefaultSpecifier(spec)) &&
          spec.local.name === importName
      );

      // 判断是否是其它路径导入了 $t
      const importedElsewhere = existImport && sourcePath !== importPath;

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

    if (lastImportPath) {
      lastImportPath.insertAfter(importNode);
    } else {
      programPath.unshiftContainer("body", importNode);
    }

    needTransform = true;
  }

  return {
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

function babelI18nImportTransform(programPath, options) {
  if (this.__runInBabelPlugin && !this.__enabled) {
    programPath.stop?.();
    return false;
  }

  const importNames = getImportNames(options);

  for (const importName of importNames) {
    i18nImportAstTransform(programPath, importName, options.i18nPkgImportPath);
  }

  return true;
}

module.exports = {
  i18nImportAstTransform,
  babelI18nImportTransform
};
