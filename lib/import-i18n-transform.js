const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const { importNodeLocalName } = require("./utils");

function i18nImportAstTransform(
  ast,
  importName,
  importPath,
  useLocalImportName
) {
  let hasI18nImport = false;
  let lastImportNode = null;
  let needAliasTransform = false;

  const localName = useLocalImportName
    ? importNodeLocalName(importName)
    : importName;

  traverse(ast, {
    ImportDeclaration(path) {
      lastImportNode = path.node;

      if (path.node.source.value === importPath) {
        hasI18nImport = true;

        // 情况1：已有 import { $t } from '@/i18n'
        const existingImport = path.node.specifiers.find(
          spec => t.isImportSpecifier(spec) && spec.imported.name === importName
        );

        if (
          existingImport &&
          !t.isImportSpecifier(existingImport, {
            local: { name: localName }
          })
        ) {
          // 将 $t 改为 _$t
          existingImport.local = t.identifier(localName);
          needAliasTransform = true;
        }

        // 情况2：已有 import i18n from '@/i18n'
        else if (
          path.node.specifiers.some(spec => t.isImportDefaultSpecifier(spec))
        ) {
          // 添加 { $t as _$t }
          path.node.specifiers.push(
            t.importSpecifier(t.identifier(localName), t.identifier(importName))
          );
          needAliasTransform = true;
        }

        // 情况3：已有 import { other } from '@/i18n'
        else if (path.node.specifiers.length > 0) {
          // 添加 $t as _$t
          path.node.specifiers.push(
            t.importSpecifier(t.identifier(localName), t.identifier(importName))
          );
          needAliasTransform = true;
        }
      }
    }
  });

  // 情况4：完全没有导入 @/i18n
  if (!hasI18nImport) {
    const importNode = t.importDeclaration(
      // [t.importDefaultSpecifier(t.identifier("i18n"))],
      [t.importSpecifier(t.identifier(localName), t.identifier(importName))],
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
    needAliasTransform = true;
  }

  return {
    ast,
    needAliasTransform
  };
}

async function i18nImportTransform(
  code,
  path,
  importName,
  importPath,
  useLocalImportName
) {
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

    const { needAliasTransform } = i18nImportAstTransform(
      ast,
      importName,
      importPath,
      useLocalImportName
    );

    // 只有当需要修改时才重新生成代码
    if (needAliasTransform) {
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
