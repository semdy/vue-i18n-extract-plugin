const { extractI18n } = require("./extract");
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
  createFilterFn,
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
const vitePluginImportI18n = require("./vite-plugin-i18n-import");
const WebpackPluginI18n = require("./webpack-plugin-i18n");
const webpackI18nLoader = require("./webpack-i18n-loader");
const webpackI18nImportLoader = require("./webpack-i18n-import-loader");
const babelPluginI18n = require("./babel-plugin-i18n");
const babelPluginImportI18n = require("./babel-plugin-i18n-import");
const {
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent
} = require("./i18n-import-transform");

function defineConfig(options) {
  if (typeof options === "function") {
    return options();
  }
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
  createFilterFn,
  excludeDirectives,
  EXCLUDED_CALL,
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin,
  vitePluginI18n,
  vitePluginImportI18n,
  WebpackPluginI18n,
  webpackI18nLoader,
  webpackI18nImportLoader,
  babelPluginImportI18n,
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent,
  defineConfig
};
