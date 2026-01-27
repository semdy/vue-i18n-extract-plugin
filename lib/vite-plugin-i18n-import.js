const { transformAsync } = require("@babel/core");
const { createI18nImportPlugin } = require("./visitors");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { bin } = require("../package.json");

function vitePluginImportI18n(userConfig = {}) {
  let filter;
  let resolvedConfig = {};
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-import",
    enforce: "post",
    async configResolved(config) {
      resolvedConfig = config;

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

      const enableSourceMap =
        resolvedConfig.command === "serve"
          ? true
          : !!resolvedConfig.build?.sourcemap;

      const result = await transformAsync(code, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: enableSourceMap,
        inputSourceMap: resolvedOptions.enableCombinedSourcemap
          ? this.getCombinedSourcemap()
          : undefined,
        plugins: [createI18nImportPlugin(resolvedOptions)]
      });

      if (!result) return;

      return {
        code: result.code,
        map: enableSourceMap ? result.map : null
      };
    }
  };
}

module.exports = vitePluginImportI18n;
