export { extractI18n } from "./extract.js";
export { defaultOptions } from "./options.js";
export {
  autoTranslate,
  translateChunks,
  createTextSplitter
} from "./translate.js";
import * as translators from "./translators/index.js";
export {
  hashKey,
  generateId,
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
export {
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
} from "./visitors.js";
export { vitePluginI18n } from "./vite-plugin-i18n.js";
export { vitePluginImportI18n } from "./vite-plugin-i18n-import.js";
export { rollupPluginI18n } from "./rollup-plugin-i18n.js";
export { rollupPluginImportI18n } from "./rollup-plugin-i18n-import.js";
export { WebpackPluginI18n } from "./webpack-plugin-i18n.js";
export { webpackI18nLoader } from "./webpack-i18n-loader.js";
export { webpackI18nImportLoader } from "./webpack-i18n-import-loader.js";
export { babelPluginI18n } from "./babel-plugin-i18n.js";
export { babelPluginI18nImport } from "./babel-plugin-i18n-import.js";
export {
  injectI18nImport,
  batchInjectI18nImport
} from "./i18n-import-injector.js";

function defineConfig(options) {
  if (typeof options === "function") {
    return options();
  }
  return options;
}

export { translators, defineConfig };
