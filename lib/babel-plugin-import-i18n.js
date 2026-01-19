const { declare } = require("@babel/helper-plugin-utils");
const { i18nImportAstTransform } = require("./import-i18n-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = declare((api, options) => {
  api.assertVersion(7);

  options = { ...defaultOptions, ...options };

  if (!options.enabled || !options.autoImportI18n) {
    return {
      name: "auto-import-i18n",
      visitor: {}
    };
  }

  const filter = createFilterFn(options);

  return {
    name: "auto-import-i18n",
    pre(file) {
      const filename = file.opts.filename || "";
      this.__enabled = filter(filename);
    },
    visitor: {
      Program(path, state) {
        if (!this.__enabled) {
          path.stop?.();
          return;
        }
        const {
          translateKey: importName,
          i18nPkgImportPath: importPath,
          JSXElement,
          jsx,
          injectHooks,
          hooksIdentifier
        } = options;

        const ast = state.file.ast;
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
});

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
