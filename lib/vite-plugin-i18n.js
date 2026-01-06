import { transformAsync } from "@babel/core";
import { createI18nPlugin } from "./visitors.js";
import { relativeCWDPath, createFilterFn } from "./utils.js";
import { defaultOptions } from "./options.js";
import { globalI18nMap, handleFinalI18nMap } from "./extract.js";
import { generateImports } from "./vite-plugin-import-i18n.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { bin } = require("../package.json");

export default function vitePluginI18n(userConfig = {}) {
  let config;
  let timer;
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-hash",
    enforce: "post",
    async config(config, { command }) {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      resolvedOptions = { ...defaultOptions, ...configFromFile, ...userConfig };
      filter = createFilterFn(resolvedOptions);

      if (command !== "serve") return null;

      const existingServerConfig = config.server || {};
      const existingWatchConfig = existingServerConfig.watch || {};
      const existingIgnored = existingWatchConfig.ignored || [];
      const newIgnored = relativeCWDPath(resolvedOptions.outputPath) + "**";

      const ignored = [
        ...(Array.isArray(existingIgnored)
          ? existingIgnored
          : [existingIgnored]),
        ...(Array.isArray(newIgnored) ? newIgnored : [newIgnored])
      ].filter(Boolean);

      return {
        server: {
          ...existingServerConfig,
          watch: {
            ...existingWatchConfig,
            ignored
          }
        }
      };
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig;
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
        .then(result => {
          if (
            resolvedOptions.outputJsonFileInPlugin &&
            config?.command === "serve"
          ) {
            clearTimeout(timer);
            timer = setTimeout(() => {
              handleFinalI18nMap(globalI18nMap, resolvedOptions, true);
            }, resolvedOptions.outputJsonFileDebounceTimeInPlugin);
          }
          return result?.code;
        })
        .catch(e => {
          console.error(e);
        });
    },
    buildEnd() {},
    closeBundle() {
      // 翻译配置写入主文件
      // console.info("翻译完成✔");
    }
  };
}

/*
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vitePluginI18n } from 'vue-i18n-extract-plugin'

export default defineConfig({
    plugins: [
        vue(),
        vitePluginI18n()
    ]
}) */
