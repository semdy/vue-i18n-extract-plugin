const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { globalI18nMap } = require("./extract");
const { generateImports } = require("./vite-plugin-import-i18n");
const { bin } = require("../package.json");

function vitePluginI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-hash",
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

      if (!resolvedOptions.enabled || !filter?.(path)) return;

      const codeWithImports = await generateImports(
        code,
        path,
        resolvedOptions
      );

      return transformAsync(codeWithImports, {
        configFile: false,
        plugins: [createI18nPlugin(resolvedOptions, globalI18nMap)]
      })
        .then(result => result?.code)
        .catch(e => {
          console.error(e);
        });
    }
  };
}

module.exports = vitePluginI18n;

/* import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vitePluginI18n } from 'vue-i18n-extract-plugin'

export default defineConfig({
    plugins: [
        vue(),
        vitePluginI18n()
    ]
}) */
