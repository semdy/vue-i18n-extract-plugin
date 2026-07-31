import { declare } from "@babel/helper-plugin-utils";
import { createI18nPlugin } from "./visitors.js";
import { hasI18nUsage } from "./cache.js";
import { createFilterFn } from "./utils.js";
import { loadConfigFileSync } from "./loadConfig.js";
import { defaultOptions } from "./options.js";

const babelPluginI18n = declare((api, userConfig) => {
  api.assertVersion(8);

  const configFromFile = loadConfigFileSync();
  const options = { ...defaultOptions, ...configFromFile, ...userConfig };

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
      const [path, query] = filename.split("?");
      if (query?.includes("type=style")) {
        this.__enabled = false;
      } else {
        this.__enabled = filter(path) && hasI18nUsage(path);
      }
      this.__runInBabelPlugin = true;
    },
    ...createI18nPlugin(options)()
  };
});

export { babelPluginI18n };

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
