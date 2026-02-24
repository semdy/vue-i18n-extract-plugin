const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { globalI18nMap } = require("./extract");
const { bin } = require("../package.json");

function rollupPluginI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "rollup-plugin-i18n-hash",
    async buildStart() {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      resolvedOptions = { ...defaultOptions, ...configFromFile, ...userConfig };
      filter = createFilterFn(resolvedOptions);
    },
    async transform(code, id) {
      if (!resolvedOptions.enabled) return;

      const [path, query] = id.split("?");

      if (query?.includes("type=style") || !filter?.(path)) return;

      const result = await transformAsync(code, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        plugins: [createI18nPlugin(resolvedOptions, globalI18nMap)]
      });

      if (!result) return;

      return {
        code: result.code,
        map: result.map || null
      };
    }
  };
}

module.exports = rollupPluginI18n;

/*
import { rollupPluginI18n } from 'extract-i18n-plugin'

export default {
    plugins: [
        rollupPluginI18n()
    ]
}
*/
