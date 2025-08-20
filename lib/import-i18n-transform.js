const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
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

    if (lastImportNode) {
      ast.program.body.splice(
        ast.program.body.indexOf(lastImportNode) + 1,
        0,
        importNode
      );
    } else {
      ast.program.body.unshift(importNode);
    }
    
    needTransform = true;
  }

  return {
    ast,
    needTransform
  };
}

async function i18nImportTransform(code, path, importNames, importPath) {
  const scriptContent = extractScriptContent(code, path);
  if (!scriptContent) return code;

  try {
    const ast = parser.parse(scriptContent, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        path.endsWith(".vue") ? "topLevelAwait" : null
      ].filter(Boolean)
    });

    let transformNeeded = false;

    for (const importName of importNames) {
      const { needTransform } = i18nImportAstTransform(
        ast,
        importName,
        importPath
      );
      transformNeeded = transformNeeded || needTransform;
    }

    // 只有当需要修改时才重新生成代码
    if (transformNeeded) {
      const { code: newScript } = generate(ast);
      return path.endsWith(".vue")
        ? code.replace(scriptContent, newScript)
        : newScript;
    }
    return code;
  } catch (err) {
    console.warn(`[auto-import-i18n] Failed to parse ${path}:`, err);
    return code;
  }
}

function extractScriptContent(code, path) {
  if (!path.endsWith(".vue")) return code;
  const scriptMatch = code.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
  return scriptMatch?.[1] || "";
}

module.exports = {
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent
};
