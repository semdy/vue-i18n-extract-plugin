import { createRequire } from "module";
import { transformAsync } from "@babel/core";
import { createI18nPlugin } from "./visitors.js";
import { createFilterFn } from "./utils.js";
import { defaultOptions } from "./options.js";
import { globalI18nMap } from "./core/index.js";

const require = createRequire(import.meta.url);
const { bin } = require("../package.json");

function vitePluginI18n(userConfig = {}) {
  let filter;
  let resolvedConfig = {};
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-extract-i18n",
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

export default vitePluginI18n;

/*
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vitePluginI18n } from 'extract-i18n-plugin'

export default defineConfig({
    plugins: [
        vue(),
        vitePluginI18n()
    ]
}) */
