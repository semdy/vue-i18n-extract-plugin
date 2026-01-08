const { i18nImportTransform } = require("./import-i18n-transform");
const { checkAgainstRegexArray, resolveAliasPath } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = async function (source) {
  // 获取 Webpack 的 Loader 上下文，方便访问文件路径及其他相关信息
  const global = this;
  const {
    includePath,
    excludedPath,
    translateKey: importName,
    JSXElement,
    jsx,
    i18nPkgImportPath: importPath,
    injectHooks,
    hooksIdentifier
  } = { ...defaultOptions, ...global.getOptions() };

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  /**
   * 黑白名单过滤：
   * - 首先检查是否在 `includePath` 白名单内；如果不在白名单内直接返回原代码。
   * - 然后检查是否在 `excludedPath` 黑名单内；如果在黑名单内则返回原代码。
   */
  if (
    includePath.length &&
    !checkAgainstRegexArray(global.resourcePath, includePath)
  ) {
    return source; // 不在白名单目录中的文件，不处理，直接返回原始代码。
  }

  if (
    excludedPath.length &&
    checkAgainstRegexArray(global.resourcePath, excludedPath)
  ) {
    return source; // 在黑名单目录中的文件，不处理，直接返回原始代码。
  }

  // 排除i18n 模块
  if (global.resourcePath.includes(resolveAliasPath(importPath))) {
    return source;
  }

  return i18nImportTransform(
    source,
    global.resourcePath,
    jsx
      ? [importName, JSXElement]
      : injectHooks
        ? [importName, hooksIdentifier]
        : [importName],
    importPath
  );
};

/**
 * // vue.config.js
const path = require('path');

module.exports = {
  chainWebpack: (config) => {
    config.module
      .rule('i18n-ast')
      .enforce('pre') // 关键配置
      .test(/\.(js|ts|vue)$/)
      .exclude(/node_modules/)
      .use('import-i18n-loader')
      .loader(path.resolve(__dirname, 'vue-i18n-extract-plugin/webpack-import-i18n-loader.js'))
      .options({
        importName: '$t',     // 可选
        importPath: '@/i18n', // 可选
      });
  },
};
 */
