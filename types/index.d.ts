export { default as babelPluginI18n } from "./babel-plugin-i18n";
export { extractI18n, addI18nImportIfNeeded } from "./extract";
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
} from "./utils";
export {
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
} from "./visitors";
export { default as vitePluginI18n } from "./vite-plugin-i18n";
export { default as vitePluginImportI18n } from "./vite-plugin-import-i18n";
export { default as WebpackPluginI18n } from "./webpack-plugin-i18n";
export { default as vueI18nLoader } from "./vue-i18n-loader";
export { default as babelPluginImportI18n } from "./babel-plugin-import-i18n";
export {
  i18nImportAstTransform,
  i18nImportTransform,
  extractScriptContent
} from "./import-i18n-transform";

declare const defaultOptions: I18nOptions;

export { defaultOptions }

export function defineConfig(options: Partial<I18nOptions>): I18nOptions;