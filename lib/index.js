import { extractI18n } from "./extract.js";
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
  extractFunctionLastName,
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
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
} from "./visitors.js";
import vitePluginI18n from "./vite-plugin-i18n.js";
import vitePluginImportI18n from "./vite-plugin-i18n-import.js";
import rollupPluginI18n from "./rollup-plugin-i18n.js";
import rollupPluginImportI18n from "./rollup-plugin-i18n-import.js";
import WebpackPluginI18n from "./webpack-plugin-i18n.js";
import webpackI18nLoader from "./webpack-i18n-loader.js";
import webpackI18nImportLoader from "./webpack-i18n-import-loader.js";
import babelPluginI18n from "./babel-plugin-i18n.js";
import babelPluginImportI18n from "./babel-plugin-i18n-import.js";
import {
  i18nImportAstTransform,
  babelI18nImportTransform
} from "./i18n-import-transform.js";

function defineConfig(options) {
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
  extractFunctionLastName,
  relativeCWDPath,
  shouldExtract,
  registerLangMatch,
  trimEmptyLine,
  padEmptyLine,
  createFilterFn,
  excludeDirectives,
  EXCLUDED_CALL,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin,
  vitePluginI18n,
  vitePluginImportI18n,
  rollupPluginI18n,
  rollupPluginImportI18n,
  WebpackPluginI18n,
  webpackI18nLoader,
  webpackI18nImportLoader,
  babelPluginImportI18n,
  i18nImportAstTransform,
  babelI18nImportTransform,
  defineConfig
};
