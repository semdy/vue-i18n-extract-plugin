# vue-i18n-extract-plugin

- 针对vue/react项目，从js/jsx/ts/tsx/vue文件提取中文，并生成语言包到json文件中，并支持将生成的key重写入文件中.
- 包含了vite和webpack的插件.

# USAGE
## CLI
```bash
node vue-i18n-extract-plugin/cli.js --includePath='[\"demo\"]' --rewrite
```

## Programming API
```javascript
const { extractI18n } = require("vue-i18n-extract-plugin/extract");

extractI18n(options)
  .then(() => {
    console.log("extract done！");
  })
  .catch((err) => {
    console.error("extract error:", err);
  });
```
## options
```javascript
const defaultOptions = {
  translateKey: "$t", // 翻译函数的名称
  rewrite: true, // 是否重写翻译函数的参数为哈希值
  extractFromText: true, // 是否从文本中提取翻译内容
  autoImportI18n: true, // 是否自动导入 i18n 模块
  sourcemap: false, // 是否生成sourcemap
  excludedCall: [], // 排除的调用函数名称数组
  includePath: ['src'], // 包含路径的正则表达式数组
  excludedPath: [], // 排除路径的正则表达式数组
  extraFileExtensions: [], // 需要额外支持的文件扩展名
  i18nPath: "@/src/i18n", // i18n语言包路径
  outputPath: "src/i18n/zh-CN.json", // 输出文件路径
};
```

## Vite plugin
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VitePluginI18n from 'vue-i18n-extract-plugin/vite-plugin-i18n'

export default defineConfig({
    plugins: [
        vue(),
        VitePluginI18n()
    ]
})
```

## Webpack plugin
```javascript
const WebpackPluginI18n = require('vue-i18n-extract-plugin/webpack-plugin-i18n')
const i18nPlugin = new WebpackPluginI18n()

module.exports = {
    plugins: [
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template: './public/index.html'
        }),
        i18nPlugin
    ]
}
```

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
import { VolcengineTranslator } from 'vue-i18n-extract-plugin/translators'

...
translator: new VolcengineTranslator({
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
        // 实际的接口调用可能比示例更复杂，具体可参考源码中YoudaoTranslator的实现，路径：packages\autoI18nPluginCore\src\translators\youdao.ts
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