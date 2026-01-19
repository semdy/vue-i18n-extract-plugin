const { i18nImportTransform } = require("./import-i18n-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");
const { bin } = require("../package.json");

function generateImports(code, path, option) {
  if (!option.autoImportI18n) return Promise.resolve(code);
  return i18nImportTransform(
    code,
    path,
    [
      option.translateKey,
      option.jsx && option.JSXElement,
      option.injectHooks && option.hooksIdentifier
    ].filter(Boolean),
    option.i18nPkgImportPath
  );
}

function vitePluginImportI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-i18n-import",
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

      if (
        !resolvedOptions.enabled ||
        !resolvedOptions.autoImportI18n ||
        !filter?.(path)
      ) {
        return;
      }

      return generateImports(code, path, resolvedOptions);
    }
  };
}

module.exports = vitePluginImportI18n;
module.exports.generateImports = generateImports;
