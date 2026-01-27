const { createI18nImportPlugin } = require("./visitors");
const { checkAgainstRegexArray, resolveAliasPath } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = function (source, inputSourceMap) {
  const callback = this.async();
  const ctx = this;
  const options = { ...defaultOptions, ...ctx.getOptions() };
  const { includePath, excludedPath, i18nPkgImportPath: importPath } = options;

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  if (
    includePath.length &&
    !checkAgainstRegexArray(ctx.resourcePath, includePath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  if (
    excludedPath.length &&
    checkAgainstRegexArray(ctx.resourcePath, excludedPath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  // 排除i18n 模块
  if (ctx.resourcePath.includes(resolveAliasPath(importPath))) {
    return callback(null, source, inputSourceMap);
  }

  (async () => {
    try {
      const enableCombined = options.enableCombinedSourcemap;

      const result = await transformAsync(source, {
        filename: ctx.resourcePath,
        babelrc: false,
        configFile: false,
        sourceMaps: ctx.sourceMap,
        inputSourceMap: enableCombined ? inputSourceMap : undefined,
        plugins: [createI18nImportPlugin(options)]
      });

      if (!result) {
        return callback(null, source, inputSourceMap);
      }

      const finalMap = enableCombined
        ? result.map || inputSourceMap
        : result.map || null;

      callback(null, result.code, finalMap);
    } catch (err) {
      callback(err);
    }
  })();
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
      .loader(path.resolve(__dirname, 'extract-i18n-plugin/webpack-i18n-import-loader.js'))
      .options({
        importName: '$t',     // 可选
        importPath: '@/i18n', // 可选
      });
  },
};
 */
