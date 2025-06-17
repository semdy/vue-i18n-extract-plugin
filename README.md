# vue-i18n-extract-plugin

- 针对vue/react项目，从js/jsx/ts/tsx/vue文件提取语言，生成语言包到json文件中，支持将生成的key重写入文件中（rewrite模式），并且支持自动翻译后生成翻译json文件.
- 包含了vite和webpack的插件.

# USAGE

## Install

```bash
# npm
npm i vue-i18n-extract-plugin -D
# global
npm i vue-i18n-extract-plugin -g
```

```bash
# yarn
yarn add vue-i18n-extract-plugin --dev
# global
yarn global add vue-i18n-extract-plugin
```

## CLI

```bash
extract-i18n --includePath=demo --rewrite
```

这会提取demo目录下的所有`allowedExtensions`文件的`fromLang`，并生成一个对应的JSON文件，如果开启了自动翻译，则会自动翻译并生成对应的翻译JSON文件.

## Programming API

```javascript
const { extractI18n } = require("vue-i18n-extract-plugin");

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
  translateKey: "$t", // 翻译函数的名称
  rewrite: true, // 是否重写翻译函数的参数为哈希值
  extractFromText: true, // 是否允许从纯文本节点中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  autoTranslate: true, // 提取完成后是否自动翻译
  cleanTranslate: true, // 是否清理无用的翻译内容
  incrementalExtract: false, // 是否增量提取翻译内容
  enableExtractInPlugin: true, // 是否在插件中自动提取翻译内容
  outputJsonFileInPlugin: true, // 是否在插件中输出 JSON 文件
  outputJsonFileDebounceTimeInPlugin: 2000, // 输出 JSON 文件的防抖时间
  translateInterval: 1000, // 自动翻译的间隔时间
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ['src/'], // 包含路径的正则表达式数组
  excludedPath: [], // 排除路径的正则表达式数组
  allowedExtensions: [".vue", ".tsx", ".ts", ".jsx", ".js"], // 允许提取的文件扩展名
  fromLang: 'zh-cn', // 源语言, 目前支持提取的语言有：zh-cn(zh-tw), en, ja, ko, ru
  translateLangKeys: ["zh-tw", "en"], // 需要翻译为的语言键
  i18nPkgImportPath: "@/i18n", // i18n语言包导入路径
  outputPath: "src/i18n", // 提取的语言包输出文件路径
  customGenLangFileName: langKey => langKey, // 自定义生成语言文件名
  customTranslatedText: (text, toLang) => text, // 翻译后的文本处理函数, params: text: 翻译后的文本, toLang: 翻译后的目标语言，translateLangKeys的枚举成员
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

在项目根目录创建extract-i18n.config.js，用于cli参数的配置.

```javascript
import { YoudaoTranslator } from "vite-i18n-extract-plugin/translators";

export default {
  rewrite: false,
  translator: new YoudaoTranslator({
    appId: "youdao appId",
    appKey: "youdao appKey"
  }),
  ...
};
```

## Vite plugin

```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { vitePluginImportI18n, vitePluginI18n } from "vue-i18n-extract-plugin";

export default defineConfig({
  plugins: [
    vitePluginImportI18n(options), // 自动添加import { $t } from '@/i18n'导入语句，请在i18n文件导出一个$t的方法. 注意顺序，必放在vue插件之前
    vue(),
    vitePluginI18n(options) // 用于运行时转换. 注意顺序，必放在vue插件之后
  ]
});
```

## Webpack plugin

```javascript
const { WebpackPluginI18n } = require("vue-i18n-extract-plugin");

module.exports = {
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html"
    }),
    new WebpackPluginI18n(options)
  ]
};
```

## **重要说明**

在Vue3中，vue-i18n版本大于9.0.0时，legacy须设为false，否则在开发阶段会有`Uncaught TypeError: 'set' on proxy: trap returned falsish for property '$t'`的代理错误. 推荐写法如下：

```javascript
import { createI18n } from "vue-i18n";
import zhMessages from "@/locales/zh-cn.json";
import enMessages from "@/locales/en.json";

const i18n = createI18n({
  legacy: false,
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

# Translators

插件默认使用谷歌翻译（默认配置代理端口7890）。在网络不支持访问谷歌的情况下，我们推荐使用 **有道翻译** ✨，其翻译效果优秀。目前插件已经内置谷歌、有道和百度翻译功能。如果需要自定义翻译器，可参考下方的示例。

## Google Translate (default)

```javascript
import { GoogleTranslator } from 'vue-i18n-extract-plugin/translators'

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
import { YoudaoTranslator } from 'vue-i18n-extract-plugin/translators'

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
import { BaiduTranslator } from 'vue-i18n-extract-plugin/translators'

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
import { VolcEngineTranslator } from 'vue-i18n-extract-plugin/translators'

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
import { EmptyTranslator } from 'vue-i18n-extract-plugin/translators'

...
translator: new EmptyTranslator()
...
```

## Custom Translate

如果你有一个自用的翻译接口，可以通过以下方式自定义翻译器——

最简单的方式是使用 Translator 基类定义翻译器实例。

```javascript
import { Translator } from 'vue-i18n-extract-plugin/translators'
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
import { Translator } from 'vue-i18n-extract-plugin/translators'

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
