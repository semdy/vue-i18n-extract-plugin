const { i18nImportTransform } = require("./import-i18n-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");

function vitePluginImportI18n(option) {
  option = { ...defaultOptions, ...option };

  const filter = createFilterFn(option);

  return {
    name: "vite-plugin-import-i18n",
    enforce: "pre",
    async transform(code, path) {
      if (!option.enabled || !filter(path)) return;

      return i18nImportTransform(
        code,
        path,
        option.jsx
          ? [option.translateKey, option.JSXElement]
          : [option.translateKey],
        option.i18nPkgImportPath
      );
    }
  };
}

module.exports = vitePluginImportI18n;
