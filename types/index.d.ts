export { extractI18n } from "./extract";
import { I18nOptions } from "./options";
export {
  autoTranslate,
  translateChunks,
  createTextSplitter
} from "./translate";
export * as translators from "./translators";
export {
  hashKey,
  generateId,
  parseArg,
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
export { default as vitePluginI18n } from "./vite-plugin-i18n";
export { default as vitePluginImportI18n } from "./vite-plugin-i18n-import";
export { default as rollupPluginI18n } from "./rollup-plugin-i18n";
export { default as rollupPluginImportI18n } from "./rollup-plugin-i18n-import";
export { default as WebpackPluginI18n } from "./webpack-plugin-i18n";
export { default as webpackI18nLoader } from "./webpack-i18n-loader";
export { default as webpackI18nImportLoader } from "./webpack-i18n-import-loader";
export { default as babelPluginI18n } from "./babel-plugin-i18n";
export { default as babelPluginImportI18n } from "./babel-plugin-i18n-import";
export {
  i18nImportAstTransform,
  babelI18nImportTransform
} from "./i18n-import-transform";

declare const defaultOptions: I18nOptions;

export { defaultOptions };

export type ExtractI18nConfig = Partial<I18nOptions>;

export function defineConfig(
  options: ExtractI18nConfig | (() => ExtractI18nConfig)
): ExtractI18nConfig;
