const { declare } = require("@babel/helper-plugin-utils");
const { createI18nPlugin } = require("./visitors");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = declare((api, options) => {
  api.assertVersion(7);

  options = { ...defaultOptions, ...options };

  if (!options.enabled) {
    return {
      name: "i18n-hash-replace",
      visitor: {}
    };
  }

  const filter = createFilterFn(options);

  return {
    name: "i18n-hash-replace",
    pre(file) {
      const filename = file.opts.filename || "";
      this.__enabled = filter(filename);
      this.__runInBabelPlugin = true;
    },
    ...createI18nPlugin(options)()
  };
});

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'vue-i18n-extract-plugin/babel-plugin-i18n',
      {
        ...options
      },
    ],
  ],
};
 */
