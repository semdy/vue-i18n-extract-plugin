const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

function i18nImportAstTransform(ast, importName, importPath) {
  let hasI18nImport = false;
  let lastImportNode = null;
  let needTransform = false;

  traverse(ast, {
    ImportDeclaration(path) {
      lastImportNode = path.node;

      if (path.node.source.value === importPath) {
        hasI18nImport = true;

        // 情况1：已有 import { $t } from '@/i18n'
        const existImport = path.node.specifiers.some(
          spec => t.isImportSpecifier(spec) && spec.imported.name === importName
        );

        if (existImport) return;

        // 情况2：已有 import i18n from '@/i18n'
        if (
          path.node.specifiers.some(spec => t.isImportDefaultSpecifier(spec))
        ) {
          // 添加 { $t }
          path.node.specifiers.push(
            t.importSpecifier(
              t.identifier(importName),
              t.identifier(importName)
            )
          );
          needTransform = true;
        }
        // 情况3：已有 import { other } from '@/i18n'
        else if (path.node.specifiers.length > 0) {
          // 添加 $t as _$t
          path.node.specifiers.push(
            t.importSpecifier(
              t.identifier(importName),
              t.identifier(importName)
            )
          );
          needTransform = true;
        }
      }
    }
  });

  // 情况4：完全没有导入 @/i18n
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

async function i18nImportTransform(code, path, importName, importPath) {
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

    const { needTransform } = i18nImportAstTransform(
      ast,
      importName,
      importPath
    );

    // 只有当需要修改时才重新生成代码
    if (needTransform) {
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
