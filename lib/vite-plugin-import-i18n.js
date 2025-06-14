const { createFilter } = require("@rollup/pluginutils");
const { i18nImportTransform } = require("./import-i18n-transform");
const { defaultOptions } = require("./options");
const { resolveFilterPath, fixFolderPath } = require("./utils");

function vitePluginImportI18n(options) {
  const {
    i18nPkgImportName: importName,
    i18nPkgImportPath: importPath,
    allowedExtensions: extensions,
    includePath,
    excludedPath
  } = { ...defaultOptions, ...options };

  const filter = createFilter(
    extensions
      .map(ext => includePath.map(p => `${fixFolderPath(p)}**/*${ext}`))
      .flat(),
    [
      "node_modules/**",
      importPath.endsWith("/")
        ? [
            resolveFilterPath(importPath + "index.ts"),
            resolveFilterPath(importPath + "index.js")
          ]
        : [
            resolveFilterPath(importPath + ".ts"),
            resolveFilterPath(importPath + ".js")
          ],
      excludedPath.map(resolveFilterPath)
    ].flat()
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
