const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

async function i18nImportTransform(code, path, importName, importPath) {
  const scriptContent = extractScriptContent(code, path);
  if (!scriptContent) return;

  try {
    const ast = parser.parse(scriptContent, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        path.endsWith(".vue") ? "topLevelAwait" : null
      ].filter(Boolean)
    });

    let shouldInject = true;
    let lastImportNode = null;

    traverse(ast, {
      ImportDeclaration(path) {
        lastImportNode = path.node;
        if (
          path.node.source.value === importPath &&
          path.node.specifiers.some(spec => spec.imported?.name === importName)
        ) {
          shouldInject = false;
        }
      }
    });

    // 如果未导入，则注入
    if (shouldInject) {
      const importNode = {
        type: "ImportDeclaration",
        specifiers: [
          {
            type: "ImportSpecifier",
            imported: { type: "Identifier", name: importName },
            local: { type: "Identifier", name: importName }
          }
        ],
        source: { type: "StringLiteral", value: importPath }
      };

      if (lastImportNode) {
        // 插入到最后一个 import 之后
        ast.program.body.splice(
          ast.program.body.indexOf(lastImportNode) + 1,
          0,
          importNode
        );
      } else {
        // 插入到最前面
        ast.program.body.unshift(importNode);
      }

      // 重新生成代码
      const { code: newScript } = generate(ast);
      return path.endsWith(".vue")
        ? code.replace(scriptContent, newScript)
        : newScript;
    }
  } catch (err) {
    console.warn(`[auto-import-i18n] Failed to parse ${path}:`, err);
  }
  return code;
}

function extractScriptContent(code, path) {
  if (!path.endsWith(".vue")) return code;
  const scriptMatch = code.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
  return scriptMatch?.[1] || "";
}

module.exports = {
  i18nImportTransform,
  extractScriptContent
};
