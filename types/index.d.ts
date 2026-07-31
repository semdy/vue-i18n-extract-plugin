import { I18nOptions, ExtractI18nConfig } from "./options";

export { extractI18n } from "./extract";
export { I18nOptions, ExtractI18nConfig, LangKey } from "./options";
export {
  autoTranslate,
  translateChunks,
  createTextSplitter
} from "./translate";
export * as translators from "./translators";
export {
  hashKey,
  generateId,
  isEmptyObject,
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
} from "./utils";
export { isTFunction, createI18nVisitor, createI18nPlugin } from "./visitors";
export { vitePluginI18n } from "./vite-plugin-i18n";
export { vitePluginImportI18n } from "./vite-plugin-i18n-import";
export { rollupPluginI18n } from "./rollup-plugin-i18n";
export { rollupPluginImportI18n } from "./rollup-plugin-i18n-import";
export { WebpackPluginI18n } from "./webpack-plugin-i18n";
export { webpackI18nLoader } from "./webpack-i18n-loader";
export { webpackI18nImportLoader } from "./webpack-i18n-import-loader";
export { babelPluginI18n } from "./babel-plugin-i18n";
export { babelPluginI18nImport } from "./babel-plugin-i18n-import";
export {
  injectI18nImport,
  batchInjectI18nImport
} from "./i18n-import-injector";

declare const defaultOptions: I18nOptions;

export { defaultOptions };

export function defineConfig(
  options: ExtractI18nConfig | (() => ExtractI18nConfig)
): ExtractI18nConfig;
