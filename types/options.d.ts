export type LangKey = "zh-cn" | 'zh-tw' | 'en' | 'ja' | 'ko' | 'ru' | string

export interface I18nOptions {
  translateKey: string
  rewrite: boolean
  extractFromText: boolean
  autoImportI18n: boolean
  autoTranslate: boolean
  cleanTranslate: boolean
  enabled: boolean
  outputJsonFileInPlugin: boolean
  outputJsonFileDebounceTimeInPlugin: number
  translateInterval: number
  excludedCall: string[]
  includePath: string[] | string
  excludedPath: string[] | string
  allowedExtensions: string[]
  fromLang: LangKey
  translateLangKeys: LangKey[]
  i18nPkgImportPath: string
  outputPath: string
  generateId: ((text: string) => string) | null | undefined
  customGenLangFileName: (langKey: LangKey) => LangKey
  customTranslatedText: (text: string, toLang: LangKey) => string,
//   translator: new GoogleTranslator({
//     // proxyOption: {
//     //     port: 7890,
//     //     host: '127.0.0.1',
//     //     headers: {
//     //         'User-Agent': 'Node'
//     //     }
//     // }
//   })
};