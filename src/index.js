import babelPluginI18n from "./babel-plugin-i18n.js";
import { extractI18n, addI18nImportIfNeeded } from "./extract.js";
import { defaultOptions } from "./options.js";
import {
  autoTranslate,
  translateChunks,
  createTextSplitter
} from "./translate.js";
import * as translators from "./translators/index.js";
import {
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
} from "./utils.js";
import {
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
} from "./visitors.js";
import vitePluginI18n from "./vite-plugin-i18n.js";
import vitePluginImportI18n from "./vite-plugin-import-i18n.js";
import WebpackPluginI18n from "./webpack-plugin-i18n.js";
import vueI18nLoader from "./vue-i18n-loader.js";
import babelPluginImportI18n from "./babel-plugin-import-i18n.js";
import {
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent
} from "./import-i18n-transform.js";

export function defineConfig(options) {
  if (typeof options === "function") {
    return options();
  }
  return options;
}

export {
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
  extractScriptContent
};
