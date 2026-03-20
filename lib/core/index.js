const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const prettier = require("prettier");
const { createI18nVisitor } = require("../visitors");
const {
  isEmptyObject,
  isSvelte,
  isMarko,
  warningOnce,
  shouldExtract
} = require("../utils");

let globalI18nMap = {};

const keepRawTextOptions = {
  jsescOption: {
    minimal: true // 保留原始字符串，不被转义成Unicode
  }
};

function encodeToString(str) {
  return str.indexOf("'") === -1 ? `'${str}'` : `"${str}"`;
}

function _shouldExtract(text, options) {
  return (options.shouldExtract || shouldExtract)(text, options.fromLang);
}

function rebuildPattern(p, extensions) {
  if (path.extname(p) !== "") {
    return p;
  }
  if (p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  if (p.endsWith("**")) {
    return `${p}/*.{${extensions}}`;
  }
  if (p.endsWith("*")) {
    return `${p}.{${extensions}}`;
  }
  return `${p}/**/*.{${extensions}}`;
}

function wrapAsStatement(expression) {
  return `const _expr = ${expression};`;
}

function unwrapTransformedCode(ast) {
  let extractedNode = null;

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.name === "_expr") {
        extractedNode = path.node.init;
        path.stop();
      }
    }
  });

  if (extractedNode) {
    const { code: exprCode } = generate(extractedNode, keepRawTextOptions);
    return exprCode;
  } else {
    console.warn("⚠️ 未能提取到 _expr 表达式");
    return null;
  }
}

function transformScript(code, options, useAst, i18nMap) {
  const innerI18nMap = i18nMap || {};
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx",
      "classProperties",
      "classPrivateProperties",
      "classPrivateMethods",
      ["decorators", { decoratorsBeforeExport: true }]
    ]
  });

  const newOptions = {
    ...options,
    keepDefaultMsg: options.keepRaw ? false : options.keepDefaultMsg,
    autoImportI18n: options.rewrite && options.autoImportI18n
  };

  traverse(ast, createI18nVisitor(newOptions, innerI18nMap));

  const isEmpty = isEmptyObject(innerI18nMap);

  if (!isEmpty) {
    Object.assign(globalI18nMap, innerI18nMap);
  }

  if (useAst) {
    return ast;
  }

  if (options.rewrite) {
    if (isEmpty) {
      return { changed: false, code };
    }
    return {
      changed: true,
      code: generate(ast, { retainLines: true, ...keepRawTextOptions }).code
    };
  }

  return {
    changed: false,
    code
  };
}

function transformScriptExpression(expression, options, i18nMap) {
  const wrapped = wrapAsStatement(expression);
  const transformedAst = transformScript(
    wrapped,
    { ...options, autoImportI18n: false },
    true,
    i18nMap
  );
  const transformedCode = unwrapTransformedCode(transformedAst);

  // if (useAst) {
  //   // 使用 transformScript 解析之后确保返回 CallExpression
  //   const ast = parser.parseExpression(transformedCode);

  //   // 判断是否是 CallExpression 类型，并返回
  //   if (t.isCallExpression(ast)) {
  //     return ast;
  //   } else {
  //     throw new Error(`Expected CallExpression but got: ${ast.type}`);
  //   }
  // }
  return transformedCode;
}

function transformText(text, options, innerI18nMap) {
  text = text?.replace(/\n+/g, " ").trim();
  if (!text || !_shouldExtract(text, options)) return null;

  if (options.pipeStyle) {
    const id = generateId(text, options);

    innerI18nMap[id] = text;

    if (options.keepDefaultMsg) {
      return `'${id}' | t:'${text}'`;
    }
    return `'${id}' | t`;
  }

  const replacement = transformScriptExpression(
    encodeToString(text),
    options,
    innerI18nMap
  );

  return replacement || null;
}

async function formatFile(code, filePath) {
  const options = await prettier.resolveConfig(filePath);

  const plugins = options.plugins || [];

  if (isSvelte(filePath)) {
    try {
      const sveltePlugin = await import("prettier-plugin-svelte");
      plugins.push(sveltePlugin.default || sveltePlugin);
    } catch {
      warningOnce(`
⚠️ [extract-i18n]

Detected a Svelte project but "prettier-plugin-svelte" is not installed.

Run:

npm install -D prettier-plugin-svelte
`);
    }
  }

  if (isMarko(filePath)) {
    try {
      const markoPlugin = await import("prettier-plugin-marko");
      plugins.push(markoPlugin.default || markoPlugin);
    } catch {
      warningOnce(`
⚠️ [extract-i18n]

Detected a Marko project but "prettier-plugin-marko" is not installed.

Run:

npm install -D prettier-plugin-marko
`);
    }
  }

  try {
    return await prettier.format(code, {
      ...options,
      filepath: filePath,
      plugins
    });
  } catch (e) {
    return code;
  }
}

module.exports = {
  globalI18nMap,
  encodeToString,
  rebuildPattern,
  transformScript,
  transformScriptExpression,
  transformText,
  formatFile,
  _shouldExtract
};
