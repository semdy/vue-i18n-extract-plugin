# extract-i18n-plugin

**中文 | [English](README_en.md)**

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/semdy/extract-i18n-plugin)
[![npm version](https://img.shields.io/npm/v/extract-i18n-plugin.svg?maxAge=3600)](https://npmjs.com/package/extract-i18n-plugin)
[![Stars](https://img.shields.io/github/stars/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/stargazers)
[![Forks](https://img.shields.io/github/forks/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/forks)
[![Issues](https://img.shields.io/github/issues/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/issues)
[![GitHub contributors](https://img.shields.io/github/contributors/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/graphs/contributors)
[![License](https://img.shields.io/github/license/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/blob/main/LICENSE)

extract-i18n-plugin是一个集extract、compile、rewrite、translate于一身的vite/rollup/webpack/babel/cli插件，支持基于React、vue(包括uni-app)、svelte5、solid-js的项目。查看[示例](https://github.com/semdy/extract-i18n-plugin/tree/main/examples)获取更多信息. 有了该插件的加持，多语言工作将变得不再繁琐和痛苦，它将为你一站式搞定。

# USAGE

## Install

```bash
# npm
npm install extract-i18n-plugin -D
yarn add extract-i18n-plugin -D
pnpm add extract-i18n-plugin -D
```

## CLI

`extract-i18n`是一个命令行工具，主要功能：提取、编译、重写、翻译.

例如：

```bash
extract-i18n --includePath=src --rewrite
```

这会提取src目录下的所有`allowedExtensions`文件的`fromLang`，生成JSON语言包自动翻译并生成对应的翻译JSON文件.

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
  allowedExtensions: [".vue", ".nvue", ".uvue", ".svelte", ".tsx", ".ts", ".jsx", ".js", ".uts"], // 允许提取的文件扩展名
  fromLang: 'zh-cn', // 源语言, 目前支持提取的语言有：zh-cn(zh-tw), en, ja, ko, ru，其它语言请使用shouldExtract判断是否要被提取
  translateLangKeys: ["zh-tw", "en"], // 定义要翻译成哪些语言
  i18nPkgImportPath: "@/i18n", // i18n语言包导入路径
  outputPath: "src/i18n", // 提取的语言包输出文件路径
  generateId: null, // 自定义生成 key 的函数
  shouldExtract: null, // 自定义是否提取文本的判断函数
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

babel插件不会自动带入extract.config.js中的配置，但会带上defaultOptions，优先级：userConfig > defaultOptions

## Deprecated

仓库中的`babel-plugin-i18n-import`、`rollup-plugin-i18n-import`、`vite-plugin-i18n-import`、`webpack-i18n-import-loader`已弃用，因为主插件中带有自动生成导入i18n的逻辑。

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

export default i18n;
```

另外：如果不想使用vite/webpack插件，可以手动调用`extract-i18n --rewrite`，这会将转换后的代码重新写入源文件（uni-app X项目可用于此模式）.

## Known issues & Guidelines

- 由于svelte和solid-js编译器都有静态提升的优化策略，因此不支持纯文本提取，需要在源码中使用显示调用`$t("文本")`的方式。

- vue编译器同样有静态提升以及静态节点标记(patchFlag)的优化，该插件会将它重新标记为动态节点，否则切换语言后，节点不会更新。绝大部分情况下纯文本提取没问题，有问题的地方建议使用显式调用`$t("文本")`的方式。

- 基于uni-app的小程序项目的建议：开发时直接写纯文本，然后使用`extract-i18n --rewrite --keepRaw`转换，会将`"文本"`转换成`$t("文本")`并写入源码，不然该插件将无法正常工作，因为根据uni-app编译器策略，静态文本会保留在wxml文件中，只有动态内容才会编译到js文件中，这样才能被正常提取和转换。

- uni-app X项目底层编译器是kotlin, 需要提前将源码进行转换。建议使用`extract-i18n --rewrite --keepDefaultMsg`将`"文本"`转换成`$t("id","文本")`，这样既保证了i18n的功能也不影响对源码的阅读。

- svelte4 typescript项目静态提取不受支持，因为svelte 4.0编译器的parser不支持typescript。

- svelte项目建议添加`prettier-plugin-svelte`依赖，因为`rewrite`模式会调用`prettier`格式化`.svelte`文件，`svelte`文件格式化依赖这个插件.

- 对于纯英文项目，在源码中应该使用显式调用`$t("文本")`的方式。因为该插件无法区分需要翻译的文本和代码中的字符串。

- `extractFromText`设为`false`，则纯文本不会被提取，只会从`$t()`中提取文本，能一定程序上提高性能。

- 有动态插件的文本需要显式调用`$t()`，如：`$t("{name}的余额为{balance}", {name: '张三', balance: 100})`

总结：

纯文本编写有很好的便利性，但`$t()`有更好的稳定性和可靠性（特别是vue项目），当然也可以混用。该插件已经服务了公司内部多个涵盖React、Vue、uni-app(APP-PLUS、X、H5、小程序)的项目，不管用哪种方式，稳定性和可靠性都不错。

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
