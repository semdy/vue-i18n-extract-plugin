const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { i18nImportTransform } = require("./import-i18n-transform");
const { relativeCWDPath, createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { globalI18nMap, handleFinalI18nMap } = require("./extract");
const { bin } = require("../package.json");

function generateImports(code, path, option) {
  if (!option.autoImportI18n) return Promise.resolve(code);
  return i18nImportTransform(
    code,
    path,
    option.jsx
      ? [
          option.translateKey,
          option.JSXElement,
          option.injectUseTranslation ? option.useTranslationIdentifier : null
        ].filter(Boolean)
      : option.injectUseTranslation
        ? [option.translateKey, option.useTranslationIdentifier]
        : [option.translateKey],
    option.i18nPkgImportPath
  );
}

function vitePluginI18n(option = {}) {
  let config;
  let timer;
  let filter;

  return {
    name: "vite-plugin-i18n-hash",
    enforce: "post",
    async config(config, { command }) {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      option = { ...defaultOptions, ...configFromFile, ...option };
      filter = createFilterFn(option);

      if (command !== "serve") return null;

      const existingServerConfig = config.server || {};
      const existingWatchConfig = existingServerConfig.watch || {};
      const existingIgnored = existingWatchConfig.ignored || [];
      const newIgnored = relativeCWDPath(option.outputPath) + "**";

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

      if (!option.enabled || !filter?.(path)) return;

      const codeWithImports = await generateImports(code, path, option);

      return transformAsync(codeWithImports, {
        configFile: false,
        plugins: [createI18nPlugin(option, globalI18nMap)]
      })
        .then(result => {
          if (option.outputJsonFileInPlugin && config?.command === "serve") {
            clearTimeout(timer);
            timer = setTimeout(() => {
              handleFinalI18nMap(globalI18nMap, option, true);
            }, option.outputJsonFileDebounceTimeInPlugin);
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
