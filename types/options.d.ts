import { Translator } from "./translators";

export type LangKey = "zh-cn" | "zh-tw" | "en" | "ja" | "ko" | "ru" | string;

export interface I18nOptions {
  translateKey: string;
  useTranslationIdentifier: string;
  JSXElement: string;
  injectUseTranslation: boolean;
  jsx: boolean;
  rewrite: boolean;
  extractFromText: boolean;
  autoImportI18n: boolean;
  autoTranslate: boolean;
  cleanTranslate: boolean;
  keepRaw: boolean;
  keepDefaultMsg: boolean;
  enabled: boolean;
  debug: boolean;
  outputJsonFileInPlugin: boolean;
  outputJsonFileDebounceTimeInPlugin: number;
  translateInterval: number;
  excludedCall: string[];
  includePath: string[] | string;
  excludedPath: string[] | string;
  allowedExtensions: string[];
  fromLang: LangKey;
  translateLangKeys: LangKey[];
  i18nPkgImportPath: string;
  outputPath: string;
  generateId:
    | ((text: string, rawGenerateIdFn?: (text: string) => string) => string)
    | null
    | undefined;
  shouldExtract: (text: string, langKey: LangKey) => boolean;
  customGenLangFileName: (langKey: LangKey) => LangKey;
  customTranslatedText: (text: string, toLang: LangKey) => string;
  translator: Translator;
}
