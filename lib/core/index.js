import path from "node:path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { generate } from "@babel/generator";
import prettier from "prettier";
import { createI18nVisitor } from "../visitors.js";
import {
  isSvelte,
  isMarko,
  warningOnce,
  shouldExtract as _shouldExtract,
  generateId as _generateId,
  normalizeText
} from "../utils.js";

export const globalI18nMap = {};

export const EMPTY_PLACEHOLDER = Symbol("empty_placeholder");

export const keepRawTextOptions = {
  jsescOption: {
    minimal: true // 保留原始字符串，不被转义成Unicode
  }
};

export function generateId(rawText, options) {
  if (typeof options.generateId === "function") {
    return options.generateId(rawText, _generateId);
  }
  return _generateId(rawText);
}

export function encodeToString(str) {
  return str.indexOf("'") === -1 ? `'${str}'` : `"${str}"`;
}

export function shouldExtract(text, options) {
  return (options.shouldExtract || _shouldExtract)(text, options.fromLang);
}

export function mergeObjectWithoutEmpty(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key) && source[key] !== EMPTY_PLACEHOLDER) {
      target[key] = source[key];
    }
  }
  return target;
}

export function isObjectRealEmpty(obj) {
  const keys = Object.keys(obj).filter(key => obj[key] !== EMPTY_PLACEHOLDER);
  return keys.length === 0;
}

export function rebuildPattern(p, extensions) {
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
    console.warn("⚠️ Failed to extract the _expr expression.");
    return null;
  }
}

export function transformScript(code, options, i18nMap) {
  const innerI18nMap = i18nMap || {};
  const ast = parse(code, {
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

  Object.assign(globalI18nMap, innerI18nMap);

  const isEmpty = isObjectRealEmpty(innerI18nMap);

  if (options.rewrite) {
    if (isEmpty) {
      return { changed: false, ast, code };
    }

    return {
      changed: true,
      ast,
      code: generate(ast, { retainLines: true, ...keepRawTextOptions }).code
    };
  }

  return {
    changed: !isEmpty,
    ast,
    code
  };
}

export function transformScriptExpression(expression, options, i18nMap) {
  const wrapped = wrapAsStatement(expression);
  const { ast, changed } = transformScript(
    wrapped,
    { ...options, autoImportI18n: false },
    i18nMap
  );

  if (!changed) {
    return null;
  }

  return unwrapTransformedCode(ast);
}

export function transformText(text, options, innerI18nMap) {
  text = normalizeText(text);
  if (!text || !shouldExtract(text, options)) {
    // rewrite模式仍记录id，方便后续清理无用翻译
    if (options.rewrite && text) {
      innerI18nMap[text] = EMPTY_PLACEHOLDER;
    }

    return null;
  }

  if (options.pipeStyle) {
    const id = generateId(text, options);

    innerI18nMap[id] = text;

    if (options.keepDefaultMsg) {
      return `'${id}' | t:'${text}'`;
    }
    return `'${id}' | t`;
  }

  return transformScriptExpression(encodeToString(text), options, innerI18nMap);
}

export async function formatFile(code, filePath) {
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
