const path = require("path");
const { defaultOptions } = require("./options");
const { globalI18nMap, handleFinalI18nMap } = require("./extract");

/**
 * Webpack 插件实现，用于自动化处理国际化翻译功能
 */
class WebpackPluginI18n {
  options = defaultOptions;
  /**
   * 初始化插件并合并用户配置
   * @param optionInfo 用户提供的配置
   */
  constructor(optionInfo) {
    if (optionInfo) {
      // 合并用户配置到默认配置中
      this.options = {
        ...this.options,
        ...optionInfo
      };
    }
    this.timer = null;
  }

  /**
   * Webpack 插件核心方法，用于集成到编译流程中
   * @param compiler Webpack 编译器实例
   */
  apply(compiler) {
    /**
     * 检查是否已经添加过这个自定义 Loader，避免重复添加
     * @param rule Webpack 模块规则
     * @returns 如果已经添加过自定义 Loader 则返回 true，否则返回 false
     */
    const hasCustomLoader = rule =>
      rule.use &&
      Array.isArray(rule.use) &&
      rule.use.some(
        ({ loader }) => loader && loader.includes("vue-i18n-loader.js")
      );

    /**
     * 在编译前阶段动态添加自定义 Loader
     */
    compiler.hooks.environment.tap("webpackPluginsI18n", () => {
      // 检查 compiler 配置中是否有 module.rules 且没有添加过自定义 Loader
      if (
        compiler.options.module?.rules &&
        !compiler.options.module.rules.some(hasCustomLoader)
      ) {
        const loaderRegex = generateAdvancedRegex(this.options);
        if (this.options.enableExtractInPlugin) {
          // 向 module.rules 中添加自定义 Loader
          compiler.options.module?.rules.push({
            // 生成高级正则表达式，用于匹配目标文件
            test: loaderRegex,
            // 设置 Loader 执行顺序为后置
            enforce: "post",
            use: [
              {
                // 指定自定义 Loader 的路径
                loader: path.resolve(__dirname, "./vue-i18n-loader.js"),
                options: this.options
              }
            ]
          });
        }

        if (this.options.autoImportI18n) {
          compiler.options.module?.rules.push({
            // 生成高级正则表达式，用于匹配目标文件
            test: loaderRegex,
            // 设置 Loader 执行顺序为前置
            enforce: "pre",
            use: [
              {
                // 指定自定义 Loader 的路径
                loader: path.resolve(
                  __dirname,
                  "./webpack-import-i18n-loader.js"
                ),
                options: this.options
              }
            ]
          });
        }
      }
    });

    /**
     * 在构建阶段执行翻译任务
     */
    compiler.hooks.emit.tapPromise("webpackPluginI18n", _compilation => {
      // 输出构建阶段开始批量翻译的信息
      if (this.options.outputJsonFileInPlugin) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          handleFinalI18nMap(globalI18nMap, this.options, true);
        }, this.options.outputJsonFileDebounceTimeInPlugin);
      }
      // 输出翻译完成的信息
      // console.info("翻译完成✔");
    });
  }
}

/**
 * 动态生成一个正则表达式，用于匹配目标文件。
 *
 * 验证以下条件：
 *  - 文件名需以特定的扩展名结尾（如 `.vue`, `.ts` 等）
 *  - 必须满足 `option.includePath` 中的至少一个短语或正则表达式；
 *  - 不能满足 `option.excludedPath` 中的任何短语或正则表达式。
 *
 * @param extensions 文件扩展名数组 (如: ['.vue', '.tsx', '.jsx', '.js', '.ts'])
 * @returns 匹配文件的动态生成正则表达式
 */
function generateAdvancedRegex(option) {
  // 生成扩展名的正则表达式部分
  const extensionsRegex = `(${option.allowedExtensions
    .map(ext => ext.replace(".", "\\."))
    .join("|")})$`;

  /**
   * 将短语（字符串或正则）转化为正则表达式
   * @param phrase 包含字符串或正则的短语
   * @returns 短语对应的正则表达式
   */
  function phraseToRegex(phrase) {
    if (phrase instanceof RegExp) {
      // 如果是正则表达式，直接返回其源字符串
      return phrase.source;
    }
    // 如果是字符串，对特殊字符进行转义
    return phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  // 获取用户配置的包含路径
  const includePhrases = option.includePath;

  // 获取用户配置的排除路径
  const excludePhrases = option.excludedPath.map(phrase =>
    phrase.replace(/\*/g, "")
  );

  // 生成包含路径的正则表达式部分
  const includeRegex = includePhrases.length
    ? `(?=.*(${includePhrases.map(phraseToRegex).join("|")}))`
    : "";

  // 生成排除路径的正则表达式部分
  const excludeRegex = excludePhrases.length
    ? `^(?!.*(${excludePhrases.map(phraseToRegex).join("|")}))`
    : "";

  // 组合最终的正则表达式
  const finalRegex = `${excludeRegex}${includeRegex}.*${extensionsRegex}`;
  // 返回忽略大小写的正则表达式对象
  return new RegExp(finalRegex, "i");
}

module.exports = WebpackPluginI18n;

/*
const WebpackPluginI18n = require('vue-i18n-extract-plugin')
const i18nPlugin = new WebpackPluginI18n()

module.exports = {
    plugins: [
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template: './public/index.html'
        }),
        i18nPlugin
    ]
} */
