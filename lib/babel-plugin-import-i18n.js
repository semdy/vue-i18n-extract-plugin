const { i18nImportAstTransform } = require("./import-i18n-transform");
const { defaultOptions } = require("./options");

module.exports = function () {
  return {
    name: "auto-import-i18n",
    visitor: {
      Program(path, state) {
        const {
          translateKey: importName,
          i18nPkgImportPath: importPath,
          JSXElement,
          jsx,
          enabled,
          autoImportI18n,
          injectHooks,
          hooksIdentifier
        } = {
          ...defaultOptions,
          ...state.opts
        };

        if (!enabled || !autoImportI18n) return;

        const ast = path.parentPath?.node || path.node;
        const importNames = jsx
          ? [importName, JSXElement]
          : injectHooks
            ? [importName, hooksIdentifier]
            : [importName];

        for (const importName of importNames) {
          i18nImportAstTransform(ast, importName, importPath);
        }
      }
    }
  };
};

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'vue-i18n-extract-plugin/babel-plugin-import-i18n', // 插件路径
      {
        ...options
      },
    ],
  ],
};
 */
