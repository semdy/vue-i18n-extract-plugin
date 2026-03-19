const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const t = require("@babel/types");
const { createFilter } = require("@rollup/pluginutils");

function hashKey(str) {
  return crypto.createHash("sha512").update(str).digest("base64").slice(0, 6);
}

function generateId(text, length = 6) {
  let hash = 5381; // 初始哈希值（素数基数）

  // 1. 计算稳定哈希值
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i); // DJB2哈希变种
  }

  // 2. 生成6位字母数字组合（Base36编码）
  return Math.abs(hash)
    .toString(36) // 转为36进制（0-9a-z）
    .padStart(length, "0")
    .slice(-length);
}

function parseArg(arg) {
  try {
    if (
      arg === "true" ||
      arg === "false" ||
      arg === "null" ||
      arg.startsWith("[") ||
      arg.startsWith("{")
    ) {
      return JSON.parse(arg);
    }
    return arg;
  } catch (err) {
    console.warn(`⚠️ 解析参数失败: ${arg}`, err);
    // 可能是因为参数不是有效的 JSON 格式，直接返回原始字符串
    return arg;
  }
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

function isVueLike(filePath) {
  return /\.(vue|nvue|uvue)$/.test(filePath);
}

function isSvelte(filePath) {
  return filePath.endsWith(".svelte");
}

function isMarko(filePath) {
  return filePath.endsWith(".marko");
}

function isAngular(filePath) {
  return filePath.endsWith(".html");
}

function tryRequire(packageName) {
  try {
    return require(packageName);
  } catch {
    return null;
  }
}

function warningOnce(message) {
  if (!warningOnce.warned) {
    console.warn(message);
    warningOnce.warned = true;
  }
}

function checkAgainstRegexArray(value, regexArray = []) {
  for (let i = 0; i < regexArray.length; i++) {
    const regex =
      typeof regexArray[i] === "string"
        ? new RegExp(regexArray[i].replace(/\*/g, ""))
        : regexArray[i];
    if (regex.test(value)) {
      return true;
    }
  }
  return false;
}

function unwrapCallee(node) {
  while (true) {
    if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) {
      node = node.callee;
      continue;
    }

    if (
      t.isTSNonNullExpression(node) || // foo!.bar()
      t.isTSAsExpression(node) || // (foo as any).bar()
      t.isTSInstantiationExpression(node) || // foo<string>()
      t.isTSTypeAssertion(node) || // (<any>foo).bar()
      t.isTSSatisfiesExpression(node) || // (foo satisfies Bar).baz()
      t.isParenthesizedExpression(node) // ((foo)).bar()
    ) {
      node = node.expression;
      continue;
    }

    break;
  }

  return node;
}

/**
 * @description: 并提取出完整的调用名称，如a.b.c() 得 a.b.c
 * @param {any} Path
 * @return {string}
 */
function extractFunctionName(path) {
  if (!path) return "";

  if (!path.isCallExpression()) {
    path = path.findParent(p => p.isCallExpression());
  }

  if (!path) return "";

  const callee = unwrapCallee(path.node.callee);
  let callName = "";

  function callObjName(callObj, name) {
    if (!callObj.property) return name.slice(1);

    const prop = t.isIdentifier(callObj.property)
      ? callObj.property.name
      : t.isStringLiteral(callObj.property)
        ? callObj.property.value
        : "";
    name = "." + prop + name;

    const obj = unwrapCallee(callObj.object);

    if (t.isMemberExpression(obj) || t.isOptionalMemberExpression(obj)) {
      return callObjName(obj, name);
    }

    if (t.isIdentifier(obj)) {
      return obj.name + name;
    }

    if (t.isThisExpression(obj)) {
      return "this" + name;
    }

    if (t.isSuper(obj)) {
      return "super" + name;
    }

    return name.slice(1);
  }

  if (t.isIdentifier(callee)) {
    callName = callee.name;
  } else if (
    t.isMemberExpression(callee) ||
    t.isOptionalMemberExpression(callee)
  ) {
    callName = callObjName(callee, "");
  }

  return callName;
}

/**
 * @description: 并提取出最后一段的调用名称，如a.b.c() 得 c
 * @param {any} Path
 * @return {string}
 */
function extractFunctionLastName(path) {
  if (!path) return "";

  if (!path.isCallExpression()) {
    path = path.findParent(p => p.isCallExpression());
  }

  if (!path) return "";

  // return path.get("callee").toString();

  const callee = unwrapCallee(path.node.callee);

  if (t.isIdentifier(callee)) {
    return callee.name;
  }

  if (t.isMemberExpression(callee) || t.isOptionalMemberExpression(callee)) {
    const prop = callee.property;

    // a.b.c() -> c
    if (t.isIdentifier(prop)) {
      return prop.name;
    }

    // obj["method"]() -> method
    if (t.isStringLiteral(prop)) {
      return prop.value;
    }
  }

  return "";
}

function relativeCWDPath(subPath) {
  const rPath = path.resolve(
    fs.realpathSync(process.cwd()),
    subPath.replace(/^\//, "").replace(/^@\//, "")
  );
  if (path.extname(rPath) !== "") {
    return rPath;
  }
  return rPath.replace(/\/$/, "") + "/";
}

function getLangJsonPath(langKey, option) {
  return (
    relativeCWDPath(option.outputPath) +
    option.customGenLangFileName(langKey) +
    ".json"
  );
}

function readJsonWithDefault(pathStr, defaultValue = {}) {
  try {
    if (!fs.existsSync(pathStr)) {
      return defaultValue;
    }
    return fs.readJSONSync(pathStr) || defaultValue;
  } catch (err) {
    console.warn(`⚠️ 读取 JSON 文件失败: ${pathStr}`, err);
    // 如果读取失败，返回默认值
    return defaultValue;
  }
}

function resolveAliasPath(pathStr) {
  if (pathStr.startsWith("@/")) {
    return "src" + pathStr.slice(1);
  }
  return pathStr;
}

function resolveFilterPath(pathStr) {
  if (/\*/.test(pathStr)) {
    // 如果包含通配符，直接返回原始路径
    return pathStr;
  }
  pathStr = resolveAliasPath(pathStr);
  if (path.extname(pathStr) !== "") {
    return pathStr;
  }
  if (pathStr.endsWith("/")) {
    return pathStr + "**";
  }
  return pathStr + "/**";
}

function fixFolderPath(pathStr) {
  if (pathStr instanceof RegExp) {
    pathStr = pathStr.source.replace(/\\/g, "").replace(/\/\//, "/");
  }
  pathStr = resolveAliasPath(pathStr);
  if (pathStr.endsWith("/")) {
    return pathStr;
  }
  return pathStr + "/";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldExtract(str, langKey) {
  const regex = REGEX_MAP[langKey] || REGEX_MAP[translateLangKeyEnum.ZH];
  if (regex instanceof RegExp) {
    return regex.test(str);
  }
  if (typeof regex === "function") {
    return regex(str);
  }
  return false;
}

function registerLangMatch(langKey, regex) {
  REGEX_MAP[langKey] = regex;
}

function trimEmptyLine(str) {
  return str.replace(/^\n+|\n+$/g, "");
}

function padEmptyLine(str) {
  return "\n" + str + "\n";
}

function createFilterFn(option) {
  const {
    i18nPkgImportPath: importPath,
    allowedExtensions: extensions,
    includePath,
    excludedPath
  } = option;

  return createFilter(
    includePath
      .map(p =>
        path.extname(p)
          ? p
          : extensions.map(ext => `${fixFolderPath(p)}**/*${ext}`)
      )
      .flat(),
    [
      "node_modules/**",
      importPath.endsWith("/")
        ? [
            resolveFilterPath(importPath + "index.ts"),
            resolveFilterPath(importPath + "index.js")
          ]
        : [
            resolveFilterPath(importPath + "/index.ts"),
            resolveFilterPath(importPath + "/index.js"),
            resolveFilterPath(importPath + ".ts"),
            resolveFilterPath(importPath + ".js")
          ],
      excludedPath.map(resolveFilterPath)
    ].flat()
  );
}

const translateLangKeyEnum = {
  ZH: "zh-cn",
  EN: "en",
  JA: "ja",
  KO: "ko",
  RU: "ru"
};

const REGEX_MAP = {
  [translateLangKeyEnum.ZH]: /[\u4e00-\u9fff]/, // 简中/繁中
  [translateLangKeyEnum.EN]: /[a-zA-Z]/,
  [translateLangKeyEnum.JA]: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/, // 日语假名和汉字
  [translateLangKeyEnum.KO]: /[\uAC00-\uD7A3]/, // 韩语字母
  [translateLangKeyEnum.RU]: /[йцукенгшщзхъфывапролджэячсмитьбюё .-]{1,}/ // 俄语字母
};

const excludeDirectives = [
  "model",
  "slot",
  "if",
  "show",
  "for",
  "on",
  "once",
  "memo"
];

const EXCLUDED_CALL = [
  "$deepScan",
  "console.log",
  "console.info",
  "console.warn",
  "console.error",
  "require",
  "_createCommentVNode"
];

module.exports = {
  hashKey,
  generateId,
  parseArg,
  isEmptyObject,
  isVueLike,
  isSvelte,
  isMarko,
  isAngular,
  tryRequire,
  warningOnce,
  checkAgainstRegexArray,
  unwrapCallee,
  extractFunctionName,
  extractFunctionLastName,
  relativeCWDPath,
  getLangJsonPath,
  readJsonWithDefault,
  resolveAliasPath,
  resolveFilterPath,
  fixFolderPath,
  sleep,
  shouldExtract,
  registerLangMatch,
  trimEmptyLine,
  padEmptyLine,
  createFilterFn,
  excludeDirectives,
  EXCLUDED_CALL
};
