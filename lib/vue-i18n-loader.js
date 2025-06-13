const { transformSync } = require("@babel/core");
const { addI18nImportIfNeeded, createI18nVisitor } = require("./visitors");
const { checkAgainstRegexArray } = require("./utils");

module.exports = function (source) {
  // 获取 Webpack 的 Loader 上下文，方便访问文件路径及其他相关信息
  const global = this;
  const option = global.getOptions();

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  /**
   * 黑白名单过滤：
   * - 首先检查是否在 `includePath` 白名单内；如果不在白名单内直接返回原代码。
   * - 然后检查是否在 `excludedPath` 黑名单内；如果在黑名单内则返回原代码。
   */
  if (
    option.includePath.length &&
    !checkAgainstRegexArray(global.resourcePath, option.includePath)
  ) {
    return source; // 不在白名单目录中的文件，不处理，直接返回原始代码。
  }

  if (
    option.excludedPath.length &&
    checkAgainstRegexArray(global.resourcePath, option.excludedPath)
  ) {
    return source; // 在黑名单目录中的文件，不处理，直接返回原始代码。
  }

  try {
    /**
     * 使用 Babel 对代码进行分析和转换：
     * - 通过设置 Babel 的 `transformSync` 方法，可以在当前代码中调用核心模块的过滤逻辑。
     * - `filter.default` 是一个 Babel 插件，用于只提取内容中符合目标语言的部分。
     * - `configFile: false` 表示不加载外部的 Babel 配置文件。
     */
    let result = transformSync(source, {
      configFile: false, // 不加载本地 Babel 配置文件
      plugins: [createI18nVisitor(option)] // 使用核心模块提供的 `filter` 插件
    });

    if (option.autoImportI18n && option.rewrite) {
      result = addI18nImportIfNeeded(result.ast, option, true);
    }

    // 如果转换成功，返回转换后的代码；否则返回空字符串。
    return result?.code || "";
  } catch (e) {
    // 捕捉和打印异常，保证整个构建过程不会中断
    console.error(e);
  }

  // 如果在过滤或转换过程中发生异常，返回原始未改动的代码
  return source;
};
