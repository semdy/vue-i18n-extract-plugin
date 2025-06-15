const { GoogleTranslator } = require("./translators");

const defaultOptions = {
  translateKey: "$t", // 翻译函数的名称
  rewrite: true, // 是否重写翻译函数的参数为哈希值
  extractFromText: true, // 是否从文本中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  autoTranslate: true, // 提取完成后是否自动翻译
  cleanTranslate: true, // 是否清理无用的翻译内容
  incrementalExtract: true, // 是否增量提取
  useLocalImportName: false, // 是否使用本地导入名称
  translateInterval: 1000, // 自动翻译的间隔时间
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ["src/"], // 包含路径的正则表达式数组
  excludedPath: [], // 排除路径的正则表达式数组
  allowedExtensions: [".vue", ".tsx", ".ts", ".jsx", ".js"], // 允许提取的文件扩展名
  fromLang: "zh-cn", // 源语言, 目前支持提取的语言有：zh-cn(zh-tw), en, ja, ko, ru
  translateLangKeys: ["en"], // 需要翻译为的语言键
  i18nPkgImportName: "$t", // i18n语言包导入名称
  i18nPkgImportPath: "@/i18n", // i18n语言包导入路径
  outputPath: "src/i18n", // 提取的语言包输出文件路径
  customGenLangFileName: langKey => langKey, // 自定义生成语言文件名
  customTranslatedText: (text, toLang) => text, // 翻译后的文本处理函数, params: text: 翻译后的文本, toLang: 翻译后的目标语言，translateLangKeys的枚举成员
  /** 翻译器，决定自动翻译使用的api与调用方式，默认使用 Google 翻译器并使用7890(clash)端口代理 */
  translator: new GoogleTranslator({
    // proxyOption: {
    //     port: 7890,
    //     host: '127.0.0.1',
    //     headers: {
    //         'User-Agent': 'Node'
    //     }
    // }
  })
};

module.exports = {
  defaultOptions
};
