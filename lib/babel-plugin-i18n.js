import { declare } from "@babel/helper-plugin-utils";
import { createI18nPlugin } from "./visitors.js";
import { createFilterFn } from "./utils.js";
import { defaultOptions } from "./options.js";

const babelPluginI18n = declare((api, options) => {
  api.assertVersion(7);

  options = { ...defaultOptions, ...options };

  if (!options.enabled) {
    return {
      name: "babel-extract-i18n",
      visitor: {}
    };
  }

  const filter = createFilterFn(options);

  return {
    name: "babel-extract-i18n",
    pre(file) {
      const filename = file.opts.filename || "";
      this.__enabled = filter(filename);
      this.__runInBabelPlugin = true;
    },
    ...createI18nPlugin(options)()
  };
});

export default babelPluginI18n;

/**
 * // babel.config.js
export default {
  presets: ["@vue/cli-plugin-babel/preset"],
  plugins: [
    [
      "extract-i18n-plugin/babel-plugin-i18n",
      {
        ...options
      }
    ]
  ]
};
*/
