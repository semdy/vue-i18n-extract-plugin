# extract-i18n-plugin

extract-i18n-plugin是一个vite/webpack的i18n语言提取/转译插件，通过丰富配置项同时支持vue-i18n、react-i18next、react-intl. 针对vue/react项目，从js/jsx/ts/tsx/vue文件中提取文本，生成语言包到json文件中，支持将生成的key重写入源文件中（rewrite模式），并且支持将自动翻译后的json文件生成到指定目录.

# USAGE

## Install

```bash
# npm
npm install extract-i18n-plugin -D
yarn add extract-i18n-plugin -D
pnpm add extract-i18n-plugin -D
```

## CLI

`extract-i18n`是一个命令行工具，它主要有两大功能：

- 提取i18n文本，翻译和生成语言包到指定目录.
- 提前将i18n文本转换为对应的key并写入源文件中.

例如：

```bash
extract-i18n --includePath=src --rewrite
```

这会提取src目录下的所有`allowedExtensions`文件的`fromLang`，并生成一个对应的JSON文件，如果开启了自动翻译，则会自动翻译并生成对应的翻译JSON文件.

## Programming API

```javascript
const { extractI18n } = require("extract-i18n-plugin");

extractI18n(options)
  .then(() => {
    console.log("extract done！");
  })
  .catch(err => {
    console.error("extract error:", err);
  });
```

## Options

```javascript
const defaultOptions = {
  translateKey: "$t", // 提取的函数的名称
  JSXElement: "Trans", // 提取的函数的 JSX 元素名称 默认为 Trans, 如：<Trans id="aaa" msg="xxx" />
  hooksIdentifier: "useTranslation", // 注入到组件的hook名称, 会注入const { $t } = useTranslation()，其中$t为translateKey的引用值
  injectHooks: false, // 是否将useTranslation自动注入到组件中
  jsx: false, // 是否启用 JSX 语法转换，开启后JSX里纯文本将转换为 <Trans id="aaa" msg="xxx" />而不是 $t("aaa")
  rewrite: false, // 是否将提取到的内容转换为id后重写入源文件
  extractFromText: true, // 是否允许从纯文本节点中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  autoTranslate: true, // 提取完成后是否自动翻译
  cleanTranslate: true, // 是否清理无用的翻译内容
  keepRaw: false, // 开启后只做转换不生成hash值，即："测试" -> $t("测试"), 开启rewrite时生效
  keepDefaultMsg: false, // 保留默认消息，即："测试" -> $t("hashedKey", "测试")
  defaultMsgPos: 1, // 默认消息参数位置，0表示第一个参数，1表示第二个参数，开启keepDefaultMsg时生效
  enableCombinedSourcemap: false, // 是否开启获取组合的源映射
  enabled: true, // 是否启用插件
  debug: true, // 是否打印日志
  translateInterval: 1000, // 翻译不同语种的间隔时间, 时间过短时可能会被限流
  excludedCall: [], // 排除的调用函数名称数组，目前已内置的函数请参阅：https://github.com/semdy/extract-i18n-plugin/blob/main/lib/utils.js#L244
  includePath: ['src/'], // 包含路径的数组
  excludedPath: ['**/node_modules/**'], // 排除路径的数组 refer to https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#how-to-exclude-directory-from-reading
  allowedExtensions: [".vue", ".nvue", ".uvue", ".tsx", ".ts", ".jsx", ".js", ".uts"], // 允许提取的文件扩展名
  fromLang: 'zh-cn', // 源语言, 目前支持提取的语言有：zh-cn(zh-tw), en, ja, ko, ru
  translateLangKeys: ["zh-tw", "en"], // 需要翻译为的语言键
  i18nPkgImportPath: "@/i18n", // i18n语言包导入路径
  outputPath: "src/i18n", // 提取的语言包输出文件路径
  generateId: null, // 自定义生成 key 的函数
  shouldExtract: null, // 自定义是否提取文件的函数
  customGenLangFileName: langKey => langKey, // 自定义生成语言文件名
  // 翻译后的文本处理函数，方便对翻译后的文本进行二次加工，如每个单词首字母大写, params: text: 翻译后的文本, toLang: 翻译后的目标语言，translateLangKeys的枚举成员
  customTranslatedText: (text, toLang) => text,
  /* 翻译器，默认使用GoogleTranslator，也可以自定义实现Translator接口 */
  translator: new GoogleTranslator()
  /** 如开启了端口代理，请配置port，如：7890 */
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
```

## Configuration file

在项目根目录创建extract-i18n.config.js，用于cli和vite/webpack/babel插件的参数配置. 示例：

```javascript
import { YoudaoTranslator } from "extract-i18n-plugin/translators";

export default {
  rewrite: false,
  translator: new YoudaoTranslator({
    appId: "youdao appId",
    appKey: "youdao appKey"
  }),
  ...
};

// ts支持 extract-i18n.config.ts
import { defineConfig } from "extract-i18n-plugin";

export default defineConfig({
  rewrite: false,
  translator: new YoudaoTranslator({
    appId: "youdao appId",
    appKey: "youdao appKey"
  }),
  ...
});
```

## Vite plugin

```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { vitePluginI18n } from "extract-i18n-plugin";

export default defineConfig({
  plugins: [
    vue(),
    // 用于运行时转换
    vitePluginI18n(userConfig)
  ]
});
```

参数优先级：userConfig > extract.config.js > defaultOptions

## Rollup plugin

```javascript
import vue from "rollup-plugin-vue";
import resolve from "@rollup/plugin-node-resolve";
import { rollupPluginI18n } from "extract-i18n-plugin";

export default {
  plugins: [
    resolve(),
    vue(),
    // 用于运行时转换
    rollupPluginI18n(userConfig)
  ]
};
```

参数优先级：userConfig > extract.config.js > defaultOptions

## Webpack plugin

```javascript
const { WebpackPluginI18n } = require("extract-i18n-plugin");

module.exports = {
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html"
    }),
    new WebpackPluginI18n(userConfig)
  ]
};
```

参数优先级：同上

## Babel plugin

```javascript
// babel.config.js
const config = require("./extract-i18n.config");
module.exports = {
  presets: ["@vue/cli-plugin-babel/preset"],
  plugins: [
    [
      "extract-i18n-plugin/babel-plugin-i18n",
      {
        ...config,
        ...userConfig
      }
    ]
  ]
};
```

说明：babel插件不会自动带入extract.config.js中的配置，但会带上defaultOptions，优先级：userConfig > defaultOptions

## **重要说明**

在Vue3中，vue-i18n版本大于9.0.0时，legacy须设为false，否则在开发阶段会有`Uncaught TypeError: 'set' on proxy: trap returned falsish for property '$t'`的代理错误. 推荐写法如下：

```javascript
import { createI18n } from "vue-i18n";
import zhMessages from "@/locales/zh-cn.json";
import enMessages from "@/locales/en.json";

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  allowComposition: true,
  fallbackLocale: "en",
  locale: "zh",
  messages: {
    en: enMessages,
    zh: zhMessages
  }
});

// 导出一个$t方法
export const $t = i18n.global.t.bind(i18n.global);

// 建议在全局也挂载一个$t方法做兜底
globalThis.$t = $t;

export default i18n;
```

另外：如果不想使用vite/webpack插件，可以手动调用`extract-i18n --rewrite`，这会将转换后的代码重新写入源文件（uni-app X项目可用于此模式）.

# Translators

插件默认使用谷歌翻译（默认配置代理端口7890）。在网络不支持访问谷歌的情况下，我们推荐使用 **有道翻译** ✨，其翻译效果优秀。目前插件已经内置谷歌、有道和百度翻译功能。如果需要自定义翻译器，可参考下方的示例。

## Google Translate (default)

```javascript
import { GoogleTranslator } from 'extract-i18n-plugin/translators'

...
translator: new GoogleTranslator({
    proxyOption: {
        host: '127.0.0.1',
        port: 7890,
        headers: {
            'User-Agent': 'Node'
        }
    }
})
...
```

## 有道Translate

需要申请api，[api文档](https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html)。

```javascript
import { YoudaoTranslator } from 'extract-i18n-plugin/translators'

...
translator: new YoudaoTranslator({
    appId: '你申请的appId',
    appKey: '你申请的appKey'
})
...
```

## 百度Translate

需要申请api，[api文档](https://api.fanyi.baidu.com/product/113)。

```javascript
import { BaiduTranslator } from 'extract-i18n-plugin/translators'

...
translator: new BaiduTranslator({
    appId: '你申请的appId', // 百度翻译 AppId
    appKey: '你申请的appKey' // 百度翻译 AppKey
})
...
```

## 火山引擎AI Translate

支持调用 `doubao` 或 `deepseek` 进行翻译，AI大模型的翻译效果会比传统的API翻译更准确，但耗时较长。
火山引擎大模型介绍：https://www.volcengine.com/docs/82379/1099455。
需要开通大模型服务并申请API，[api文档](https://www.volcengine.com/docs/82379/1298454)。

```javascript
import { VolcEngineTranslator } from 'extract-i18n-plugin/translators'

...
translator: new VolcEngineTranslator({
    apiKey: '你申请的apiKey',
    model: '你要调用的模型，如：`doubao-1-5-pro-32k-250115`，请确保使用前已在控制台开通了对应模型'
})
...
```

## Empty Translate

如果只需要扫描目标语言，不进行翻译，该翻译器会生成 JSON 文件。

```javascript
import { EmptyTranslator } from 'extract-i18n-plugin/translators'

...
translator: new EmptyTranslator()
...
```

## Custom Translate

如果你有一个自用的翻译接口，可以通过以下方式自定义翻译器——

最简单的方式是使用 Translator 基类定义翻译器实例。

```javascript
import { Translator } from 'extract-i18n-plugin/translators'
import axios from 'axios'

...
translator: new Translator({
    name: '我的翻译器',
    // 翻译的方法
    fetchMethod: (str, fromKey, toKey, _separator) => {
        // 实际的接口调用可能比示例更复杂，具体可参考源码中YoudaoTranslator的实现，路径：src\translators\youdao.js
        const myApi = 'https://www.my-i18n.cn/api/translate?from=${fromKey}&to=${toKey}&t={+new Date}'
        return axios.post(myApi, { str })
            .then(res => res.data)
    },
    // 接口触发间隔，有些接口频繁触发会被拉黑，请根据实际情况设置一个合理的接口触发间隔
    interval: 1000
})
...
```

如果需要更高阶的功能，可以使用继承，不过目前无相关场景。

```javascript
import { Translator } from 'extract-i18n-plugin/translators'

class CustomTranslator extends Translator {
    constructor () {
        super({
            name: '我的翻译器',
            ...
        })
    }
}

...
translator: new CustomTranslator()
...
```

## :copyright: License

[MIT](http://opensource.org/licenses/MIT)
