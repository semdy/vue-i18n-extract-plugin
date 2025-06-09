const babelPluginI18n = require('./babel-plugin-i18n')
const { extractI18n } = require('./extract')
const { defaultOptions } = require('./options')
const {
    autoTranslate,
    translateChunks,
    createTextSplitter,
    getLangJsonPath
} = require('./translate')
const {
  hashKey,
  generateId,
  parseArg,
  checkAgainstRegexArray,
  extractFunctionName,
  relativeCWDPath,
  shouldExtract,
  trimEmptyLine,
  padEmptyLine,
  allowedExtensions,
  excludeDirectives,
  EXCLUDED_CALL
} = require('./utils')
const {
  shouldTransform,
  isTFunction,
  addI18nImportIfNeeded,
  createI18nPlugin,
} = require('./visitors')
const VitePluginI18n = require('./vite-plugin-i18n')
const WebpackPluginI18n = require('./webpack-plugin-i18n')
const vueI18nLoader = require('./vue-i18n-loader')

module.exports = {
    babelPluginI18n,
    extractI18n,
    defaultOptions,
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
    trimEmptyLine,
    padEmptyLine,
    allowedExtensions,
    excludeDirectives,
    EXCLUDED_CALL,
    shouldTransform,
    isTFunction,
    addI18nImportIfNeeded,
    createI18nPlugin,
    VitePluginI18n,
    WebpackPluginI18n,
    vueI18nLoader
}