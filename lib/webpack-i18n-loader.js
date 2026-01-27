const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { checkAgainstRegexArray, resolveAliasPath } = require("./utils");
const { globalI18nMap } = require("./extract");
const { defaultOptions } = require("./options");

module.exports = function (source, inputSourceMap) {
  const callback = this.async();
  const ctx = this;
  const options = { ...defaultOptions, ...ctx.getOptions() };

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  if (
    options.includePath.length &&
    !checkAgainstRegexArray(ctx.resourcePath, options.includePath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  if (
    options.excludedPath.length &&
    checkAgainstRegexArray(ctx.resourcePath, options.excludedPath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  (async () => {
    try {
      // 排除i18n 模块
      if (
        options.autoImportI18n &&
        ctx.resourcePath.includes(resolveAliasPath(options.i18nPkgImportPath))
      ) {
        options.autoImportI18n = false;
      }

      const enableCombined = options.enableCombinedSourcemap;

      const result = await transformAsync(source, {
        filename: ctx.resourcePath,
        babelrc: false,
        configFile: false,
        sourceMaps: ctx.sourceMap,
        inputSourceMap: enableCombined ? inputSourceMap : undefined,
        plugins: [createI18nPlugin(options, globalI18nMap)]
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
