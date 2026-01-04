const { declare } = require("@babel/helper-plugin-utils");
const { createI18nPlugin } = require("./visitors");
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

  return {
    name: "i18n-hash-replace",
    ...createI18nPlugin(options)()
  };
});
