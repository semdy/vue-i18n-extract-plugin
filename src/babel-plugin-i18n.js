const { declare } = require("@babel/helper-plugin-utils");
const { createI18nPlugin } = require("./visitors");

module.exports = declare((api, options) => {
  api.assertVersion(7);

  return {
    name: "i18n-hash-replace",
    ...createI18nPlugin(options),
  };
});
