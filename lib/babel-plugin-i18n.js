import { declare } from "@babel/helper-plugin-utils";
import { createI18nPlugin } from "./visitors.js";
import { defaultOptions } from "./options.js";

export default declare((api, options) => {
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

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'vue-i18n-extract-plugin/babel-plugin-i18n', // 插件路径
      {
        ...options
      },
    ],
  ],
};
 */
