const { declare } = require("@babel/helper-plugin-utils");
const { i18nImportAstTransform } = require("./import-i18n-transform");
const { createFilterFn } = require("./utils");
const { defaultOptions } = require("./options");

function babelI18nImportTransform(path, ast, options) {
  if (this.__runInBabelPlugin && !this.__enabled) {
    path.stop?.();
    return false;
  }
  const {
    translateKey: importName,
    i18nPkgImportPath: importPath,
    JSXElement,
    jsx,
    injectHooks,
    hooksIdentifier
  } = options;

  const importNames = jsx
    ? [importName, JSXElement]
    : injectHooks
      ? [importName, hooksIdentifier]
      : [importName];

  for (const importName of importNames) {
    i18nImportAstTransform(ast, importName, importPath);
  }

  return true;
}

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
      this.__runInBabelPlugin = true;
    },
    visitor: {
      Program(path, state) {
        babelI18nImportTransform.call(this, path, state.file.ast, options);
      }
    }
  };
});

module.exports.babelI18nImportTransform = babelI18nImportTransform;

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'vue-i18n-extract-plugin/babel-plugin-i18n-import',
      {
        ...options
      },
    ],
  ],
};
 */
