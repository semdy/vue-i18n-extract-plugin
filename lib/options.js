const { GoogleTranslator } = require("./translators");

const defaultOptions = {
  translateKey: "$t", // 提取的函数的名称
  JSXElement: "Trans", // 提取的函数的 JSX 元素名称 默认为 Trans, 如：<Trans id="aaa" msg="xxx" />
  jsx: false, // 是否启用 JSX 语法转换，开启后JSX里纯文件将转换为 <Trans id="aaa" msg="xxx" />而不是 $t("aaa")
  rewrite: false, // 是否将提取到的内容转换为id后重写入源文件
  extractFromText: true, // 是否允许从纯文本节点中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  autoTranslate: true, // 提取完成后是否自动翻译
  cleanTranslate: true, // 是否清理无用的翻译内容
  keepRaw: false, // 开启后只做转换不生成hash值，即："测试" -> $t("测试"), 开启rewrite时生效
  keepDefaultMsg: false, // 保留默认消息，即："测试" -> $t("hashedKey", "测试")
  enabled: true, // 是否启用插件
  outputJsonFileInPlugin: true, // 是否在插件中输出 JSON 文件
  outputJsonFileDebounceTimeInPlugin: 2000, // 输出 JSON 文件的防抖时间
  translateInterval: 1000, // 自动翻译的间隔时间
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ["src/"], // 包含路径的数组
  excludedPath: [], // 排除路径的数组
  allowedExtensions: [".vue", ".nvue", ".uvue", ".tsx", ".ts", ".jsx", ".js"], // 允许提取的文件扩展名
  fromLang: "zh-cn", // 源语言, 目前支持提取的语言有：zh-cn(zh-tw), en, ja, ko, ru
  translateLangKeys: ["zh-tw", "en"], // 需要翻译为的语言键
  i18nPkgImportPath: "@/i18n", // i18n语言包导入路径
  outputPath: "src/i18n", // 提取的语言包输出文件路径
  generateId: null, // 自定义生成 key 的函数
  customGenLangFileName: langKey => langKey, // 自定义生成语言文件名
  // 翻译后的文本处理函数，方便对翻译后的文本进行二次加工，如每个单词首字母大写, params: text: 翻译后的文本, toLang: 翻译后的目标语言，translateLangKeys的枚举成员
  customTranslatedText: (text, toLang) => text,
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
