const { createFilter } = require("vite");
const { i18nImportTransform } = require("./import-i18n-transform");
const { defaultOptions } = require("./options");

function vitePluginImportI18n(options) {
  const {
    translateKey: importName,
    i18nPkgImportPath: importPath,
    allowedExtensions: extensions
  } = { ...defaultOptions, ...options };

  const filter = createFilter(
    extensions.map(ext => `**/*${ext}`),
    // 排除 node_modules
    ["node_modules/**"]
  );

  return {
    name: "vite-plugin-import-i18n",
    enforce: "pre",
    async transform(code, path) {
      if (!filter(path)) return;
      return i18nImportTransform(code, path, importName, importPath);
    }
  };
}

module.exports = vitePluginImportI18n;
