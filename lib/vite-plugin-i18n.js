const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { relativeCWDPath, createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { globalI18nMap, handleFinalI18nMap } = require("./extract");

function vitePluginI18n(option) {
  option = { ...defaultOptions, ...option };

  let config;
  let timer;

  const filter = createFilterFn(option);

  return {
    name: "vite-plugin-i18n-hash",
    enforce: "post",
    config(config, { command }) {
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
      if (!option.enabled || !filter(path)) return;

      return transformAsync(code, {
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
