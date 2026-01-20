const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { checkAgainstRegexArray, resolveAliasPath } = require("./utils");
const { globalI18nMap } = require("./extract");
const { defaultOptions } = require("./options");

module.exports = function (source, inputSourceMap) {
  const callback = this.async();
  const ctx = this;
  const option = { ...defaultOptions, ...ctx.getOptions() };

  // // webpack 4.0
  // require('loader-utils').getOptions(this)

  if (
    option.includePath.length &&
    !checkAgainstRegexArray(ctx.resourcePath, option.includePath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  if (
    option.excludedPath.length &&
    checkAgainstRegexArray(ctx.resourcePath, option.excludedPath)
  ) {
    return callback(null, source, inputSourceMap);
  }

  (async () => {
    try {
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
        configFile: false,
        sourceMaps: ctx.sourceMap,
        inputSourceMap,
        plugins: [createI18nPlugin(option, globalI18nMap)]
      });

      if (!result) {
        return callback(null, source, inputSourceMap);
      }

      callback(null, result.code, result.map || inputSourceMap);
    } catch (err) {
      callback(err);
    }
  })();
};
