const { GoogleTranslator } = require("./translators");

const defaultOptions = {
  translateKey: "$t", // 翻译函数的名称
  rewrite: true, // 是否重写翻译函数的参数为哈希值
  extractFromText: true, // 是否从文本中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  sourcemap: false, // 是否生成sourcemap
  autoTranslate: true, // 提取完成后是否自动翻译
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ['src'], // 包含路径的正则表达式数组
  excludedPath: [], // 排除路径的正则表达式数组
  extraFileExtensions: [], // 需要额外支持的文件扩展名
  fromLang: 'zh-cn', // 源语言
  translateLangKeys: ["en"], // 需要翻译为的语言键
  i18nPath: "@/src/i18n", // i18n语言包路径
  outputPath: "src/i18n/zh-CN.json", // 输出文件路径
  /** 翻译器，决定自动翻译使用的api与调用方式，默认使用 Google 翻译器并使用7890(clash)端口代理 */
  translator: new GoogleTranslator({
    proxyOption: {
        port: 7890,
        host: '127.0.0.1',
        headers: {
            'User-Agent': 'Node'
        }
    }
  })
};

module.exports = {
    defaultOptions
}