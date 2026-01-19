const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { checkAgainstRegexArray, resolveAliasPath } = require("./utils");
const { globalI18nMap } = require("./extract");
const { defaultOptions } = require("./options");

module.exports = async function (source, inputSourceMap) {
  // 获取 Webpack 的 Loader 上下文，方便访问文件路径及其他相关信息
  const callback = this.async();
  const ctx = this;
  const option = { ...defaultOptions, ...ctx.getOptions() };

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  /**
   * 黑白名单过滤：
   * - 首先检查是否在 `includePath` 白名单内；如果不在白名单内直接返回原代码。
   * - 然后检查是否在 `excludedPath` 黑名单内；如果在黑名单内则返回原代码。
   */
  if (
    option.includePath.length &&
    !checkAgainstRegexArray(ctx.resourcePath, option.includePath)
  ) {
    return callback(null, source, inputSourceMap); // 不在白名单目录中的文件，不处理，直接返回原始代码。
  }

  if (
    option.excludedPath.length &&
    checkAgainstRegexArray(ctx.resourcePath, option.excludedPath)
  ) {
    return callback(null, source, inputSourceMap); // 在黑名单目录中的文件，不处理，直接返回原始代码。
  }

  try {
    /**
     * 使用 Babel 对代码进行分析和转换：
     * - 通过设置 Babel 的 `transformSync` 方法，可以在当前代码中调用核心模块的过滤逻辑。
     * - `filter.default` 是一个 Babel 插件，用于只提取内容中符合目标语言的部分。
     * - `configFile: false` 表示不加载外部的 Babel 配置文件。
     */
    // 排除i18n 模块
    if (
      option.autoImportI18n &&
      ctx.resourcePath.includes(resolveAliasPath(option.i18nPkgImportPath))
    ) {
      option.autoImportI18n = false;
    }

    const result = await transformAsync(source, {
      filename: ctx.resourcePath,
      babelrc: false,
      configFile: false, // 不加载本地 Babel 配置文件
      sourceMaps: ctx.sourceMap,
      inputSourceMap: inputSourceMap || undefined,
      plugins: [createI18nPlugin(option, globalI18nMap)] // 使用核心模块提供的 `filter` 插件
    });

    if (!result) {
      return callback(null, source, inputSourceMap);
    }

    return callback(null, result.code, result.map || inputSourceMap);
  } catch (err) {
    console.error(err);
    return callback(err);
  }
};
