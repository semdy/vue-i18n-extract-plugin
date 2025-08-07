const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const types = require("@babel/types");

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
    console.warn(`解析参数失败: ${arg}`, err);
    // 可能是因为参数不是有效的 JSON 格式，直接返回原始字符串
    return arg;
  }
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

function checkAgainstRegexArray(value, regexArray = []) {
  for (let i = 0; i < regexArray.length; i++) {
    const regex =
      typeof regexArray[i] === "string"
        ? new RegExp(regexArray[i].replace(/\*/g, ""))
        : regexArray[i];
    if (regex.test(value)) {
      return true; // 如果符合任何一个规则，返回 true
    }
  }
  return false; // 如果所有规则都不符合，返回 false
}

/**
 * @description: 用于解析抽象语法树中的调用表达式，并提取出调用的名称，如a.b.c() 取 c。
 * @param {any} path
 * @return {*}
 */
function extractFunctionName(path) {
  const callPath = path.findParent(p => p.isCallExpression());
  if (!callPath) return "";

  const callee = callPath.node.callee;

  let callName = "";
  function callObjName(callObj, name) {
    name = "." + callObj.property.name + name;
    if (types.isMemberExpression(callObj.object)) {
      return callObjName(callObj.object, name);
    }
    return callObj.object.name + name;
  }

  if (types.isMemberExpression(callee)) {
    callName = callObjName(callee, "");
  } else if (types.isIdentifier(callee)) {
    callName = callee.name;
  }

  return callName;
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
    console.warn(`读取 JSON 文件失败: ${pathStr}`, err);
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
  "$i8n",
  "$t",
  "require",
  "$$i8n",
  "$$t",
  "$emit",
  "$emits",
  "emits",
  "_createCommentVNode"
];

module.exports = {
  hashKey,
  generateId,
  parseArg,
  isEmptyObject,
  checkAgainstRegexArray,
  extractFunctionName,
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
  excludeDirectives,
  EXCLUDED_CALL
};
