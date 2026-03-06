const { declare } = require("@babel/helper-plugin-utils");
const { babelI18nImportTransform } = require("./i18n-import-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = declare((api, options) => {
  api.assertVersion(7);

  options = { ...defaultOptions, ...options };

  if (!options.enabled || !options.autoImportI18n) {
    return {
      name: "babel-extract-i18n-import",
      visitor: {}
    };
  }

  const filter = createFilterFn(options);

  return {
    name: "babel-extract-i18n-import",
    pre(file) {
      const filename = file.opts.filename || "";
      this.__enabled = filter(filename);
      this.__runInBabelPlugin = true;
    },
    visitor: {
      Program(path) {
        babelI18nImportTransform.call(this, path, options);
      }
    }
  };
});

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'extract-i18n-plugin/babel-plugin-i18n-import',
      {
        ...options
      },
    ],
  ],
};
 */
