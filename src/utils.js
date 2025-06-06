const path = require("path");
const fs = require("fs");
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

function parseJSON(json) {
  try {
    if (json === 'true' || json === 'false' || json === 'null' || json.startsWith('[') || json.startsWith('{')) {
      console.log(json, JSON.parse(json))
      return JSON.parse(json);
    }
  } catch (error) {
    return json;
  }
}

function checkAgainstRegexArray(value, regexArray = []) {
  for (let i = 0; i < regexArray.length; i++) {
    const regex =
      typeof regexArray[i] === "string"
        ? new RegExp(regexArray[i])
        : regexArray[i];
    if (regex.test(value)) {
      return true; // 如果符合任何一个规则，返回 true
    }
  }
  return false; // 如果所有规则都不符合，返回 false
}

/**
 * @description: 用于解析抽象语法树中的调用表达式，并提取出调用的名称，如a.b.c() 取 c。
 * @param {any} node
 * @return {*}
 */
function extractFunctionName(node) {
  let callName = "";
  function callObjName(callObj, name) {
    name += "." + callObj.property.name;
    if (types.isMemberExpression(callObj.object)) {
      // isMemberExpression： 是否是成员表达式
      return callObjName(callObj.object, name);
    }
    name = callObj.object.name + name;
    return name;
  }
  if (types.isCallExpression(node)) {
    // isCallExpression： 是否是调用表达式
    if (types.isMemberExpression(node.callee)) {
      callName = callObjName(node.callee, "");
    } else {
      callName = node.callee.name || "";
    }
  }
  return callName;
}

function relativeCWDPath(subPath) {
  return path.resolve(fs.realpathSync(process.cwd()), subPath);
}

function containsChineseText(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

function shouldExtract(str) {
  return containsChineseText(str);
}

function trimEmptyLine(str) {
  return str.replace(/^\n+|\n+$/g, "");
}

function padEmptyLine(str) {
  return "\n" + str + "\n";
}

const allowedExtensions = [".vue", ".tsx", ".jsx", ".js", ".ts"];
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
  "_createCommentVNode",
];

const defaultOptions = {
  translateKey: "$t", // 翻译函数的名称
  rewrite: true, // 是否重写翻译函数的参数为哈希值
  extractFromText: true, // 是否从文本中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  sourcemap: false, // 是否生成sourcemap
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ['src'], // 包含路径的正则表达式数组
  excludedPath: [], // 排除路径的正则表达式数组
  extraFileExtensions: [], // 需要额外支持的文件扩展名
  i18nPath: "@/src/i18n", // i18n语言包路径
  outputPath: "src/i18n/zh-CN.json", // 输出文件路径
};

module.exports = {
  hashKey,
  generateId,
  parseJSON,
  checkAgainstRegexArray,
  extractFunctionName,
  relativeCWDPath,
  containsChineseText,
  shouldExtract,
  trimEmptyLine,
  padEmptyLine,
  allowedExtensions,
  EXCLUDED_CALL,
  defaultOptions,
};
