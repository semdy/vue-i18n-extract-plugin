const { transformAsync } = require("@babel/core");
const { createI18nPlugin } = require("./visitors");
const { checkAgainstRegexArray } = require("./utils");
const { defaultOptions } = require("./options");

function vitePluginI18n(option) {
  option = { ...defaultOptions, ...option };

  let config;

  return {
    name: "vite-plugin-i18n-hash",

    configResolved(resolvedConfig) {
      // 存储最终解析的配置
      config = resolvedConfig;
    },
    async transform(code, path) {
      if (option.allowedExtensions.some(ext => path.endsWith(ext))) {
        if (
          option.includePath?.length &&
          !checkAgainstRegexArray(path, option.includePath)
        ) {
          return code;
        }
        if (
          option.excludedPath?.length &&
          checkAgainstRegexArray(path, option.excludedPath)
        ) {
          return code;
        }

        return transformAsync(code, {
          configFile: false,
          plugins: [createI18nPlugin(option)]
        })
          .then(result => {
            return result?.code;
          })
          .catch(e => {
            console.error(e);
          });
      }
    },
    async buildEnd() {
      // console.info("构建阶段批量翻译");
      // await translateUtils.autoTranslate();
    },
    async closeBundle() {
      // 翻译配置写入主文件
      // await fileUtils.buildSetLangConfigToIndexFile();
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
