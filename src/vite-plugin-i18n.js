const { transformAsync } = require("@babel/core");
const { createI18nPlugin, addI18nImportIfNeeded } = require("./visitors");
const {
  checkAgainstRegexArray,
  allowedExtensions,
  defaultOptions,
} = require("./utils");

export default function i18nHashPlugin(option = defaultOptions) {
  let config;

  return {
    name: "vite:i18n-hash-full",

    configResolved(resolvedConfig) {
      // 存储最终解析的配置
      config = resolvedConfig;
    },
    async transform(code, path) {
      if (
        [...allowedExtensions, ...(option.extraFileExtensions || [])].some(
          (ext) => path.endsWith(ext)
        )
      ) {
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
          plugins: [createI18nPlugin(option).visitor],
        })
          .then((result) => {
            // if (config?.command === "serve") {
            //   translateUtils.autoTranslate(); // 执行前需要确保transformAsync已经完成
            // }
            if (option.autoImportI18n && option.rewrite) {
              result = addI18nImportIfNeeded(result.ast, option, true);
            }
            return result?.code;
          })
          .catch((e) => {
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
    },
  };
}

/**
 * import i18nHashPlugin from './vite-plugin-i18n-hash';

export default {
  plugins: [i18nHashPlugin()],
};
 */
