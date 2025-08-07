const babelPluginI18n = require("./babel-plugin-i18n");
const { extractI18n, addI18nImportIfNeeded } = require("./extract");
const { defaultOptions } = require("./options");
const {
  autoTranslate,
  translateChunks,
  createTextSplitter
} = require("./translate");
const translators = require("./translators");
const {
  hashKey,
  generateId,
  parseArg,
  checkAgainstRegexArray,
  extractFunctionName,
  relativeCWDPath,
  getLangJsonPath,
  shouldExtract,
  registerLangMatch,
  trimEmptyLine,
  padEmptyLine,
  excludeDirectives,
  EXCLUDED_CALL
} = require("./utils");
const {
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
} = require("./visitors");
const vitePluginI18n = require("./vite-plugin-i18n");
const vitePluginImportI18n = require("./vite-plugin-import-i18n");
const WebpackPluginI18n = require("./webpack-plugin-i18n");
const vueI18nLoader = require("./vue-i18n-loader");
const babelPluginImportI18n = require("./babel-plugin-import-i18n");
const {
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent
} = require("./import-i18n-transform");

function defineConfig(options) {
  return options;
}

module.exports = {
  babelPluginI18n,
  extractI18n,
  defaultOptions,
  translators,
  autoTranslate,
  translateChunks,
  createTextSplitter,
  getLangJsonPath,
  hashKey,
  generateId,
  parseArg,
  checkAgainstRegexArray,
  extractFunctionName,
  relativeCWDPath,
  shouldExtract,
  registerLangMatch,
  trimEmptyLine,
  padEmptyLine,
  excludeDirectives,
  EXCLUDED_CALL,
  shouldTransform,
  isTFunction,
  addI18nImportIfNeeded,
  createI18nVisitor,
  createI18nPlugin,
  vitePluginI18n,
  vitePluginImportI18n,
  WebpackPluginI18n,
  vueI18nLoader,
  babelPluginImportI18n,
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent,
  defineConfig
};
