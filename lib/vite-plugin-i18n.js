const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { globalI18nMap } = require("./extract");
const { bin } = require("../package.json");

function vitePluginI18n(userConfig = {}) {
  let filter;
  let resolvedConfig = {};
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-hash",
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
      if (!resolvedOptions.enabled) return;

      const [path, query] = id.split("?");

      if (query?.includes("type=style") || !filter?.(path)) return;

      const prevSourceMap = this.getCombinedSourcemap();
      const enableSourceMap = !!resolvedConfig.build?.sourcemap;

      const result = await transformAsync(code, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: enableSourceMap,
        inputSourceMap: enableSourceMap ? prevSourceMap : undefined,
        plugins: [createI18nPlugin(resolvedOptions, globalI18nMap)]
      });

      if (!result) return;

      return {
        code: result.code,
        map: enableSourceMap ? result.map : null
      };
    }
  };
}

module.exports = vitePluginI18n;

/* import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vitePluginI18n } from 'extract-i18n-plugin'

export default defineConfig({
    plugins: [
        vue(),
        vitePluginI18n()
    ]
}) */
