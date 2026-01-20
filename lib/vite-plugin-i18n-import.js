const { i18nImportTransform } = require("./i18n-import-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { bin } = require("../package.json");

function vitePluginImportI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-import",
    enforce: "post",
    async configResolved() {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      resolvedOptions = { ...defaultOptions, ...configFromFile, ...userConfig };
      filter = createFilterFn(resolvedOptions);
    },
    async transform(code, path) {
      path = path.split("?")[0];

      if (
        !resolvedOptions.enabled ||
        !resolvedOptions.autoImportI18n ||
        !filter?.(path)
      ) {
        return;
      }

      return i18nImportTransform(code, path, resolvedOptions);
    }
  };
}

module.exports = vitePluginImportI18n;
