import { createRequire } from "module";
import { transformAsync } from "@babel/core";
import { createI18nImportPlugin } from "./visitors.js";
import { createFilterFn } from "./utils.js";
import { defaultOptions } from "./options.js";

const require = createRequire(import.meta.url);
const { bin } = require("../package.json");

function rollupPluginImportI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "rollup-plugin-extract-i18n-import",
    async buildStart() {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      resolvedOptions = { ...defaultOptions, ...configFromFile, ...userConfig };
      filter = createFilterFn(resolvedOptions);
    },
    async transform(code, id) {
      if (!resolvedOptions.enabled || !resolvedOptions.autoImportI18n) {
        return;
      }

      const [path, query] = id.split("?");

      if (query?.includes("type=style") || !filter?.(path)) return;

      const result = await transformAsync(code, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        plugins: [createI18nImportPlugin(resolvedOptions)]
      });

      if (!result) return;

      return {
        code: result.code,
        map: result.map || null
      };
    }
  };
}

export default rollupPluginImportI18n;
