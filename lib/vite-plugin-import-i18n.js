const { i18nImportTransform } = require("./import-i18n-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { bin } = require("../package.json");

function vitePluginImportI18n(option = {}) {
  let filter;

  return {
    name: "vite-plugin-import-i18n",
    enforce: "pre",
    async configResolved() {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      option = { ...defaultOptions, ...configFromFile, ...option };
      filter = createFilterFn(option);
    },
    async transform(code, path) {
      path = path.split("?")[0];

      if (!option.enabled || !option.autoImportI18n || !filter?.(path)) return;

      return i18nImportTransform(
        code,
        path,
        option.jsx
          ? [
              option.translateKey,
              option.JSXElement,
              option.injectUseTranslation
                ? option.useTranslationIdentifier
                : null
            ].filter(Boolean)
          : option.injectUseTranslation
            ? [option.translateKey, option.useTranslationIdentifier]
            : [option.translateKey],
        option.i18nPkgImportPath
      );
    }
  };
}

module.exports = vitePluginImportI18n;
