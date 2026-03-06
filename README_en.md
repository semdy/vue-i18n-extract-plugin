# extract-i18n-plugin

**[中文](README.md) | English**

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/semdy/extract-i18n-plugin)
[![npm version](https://img.shields.io/npm/v/extract-i18n-plugin.svg?maxAge=3600)](https://npmjs.com/package/extract-i18n-plugin)
[![Stars](https://img.shields.io/github/stars/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/stargazers)
[![Forks](https://img.shields.io/github/forks/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/forks)
[![Issues](https://img.shields.io/github/issues/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/issues)
[![GitHub contributors](https://img.shields.io/github/contributors/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/graphs/contributors)
[![License](https://img.shields.io/github/license/semdy/extract-i18n-plugin.svg?style=flat-square)](https://github.com/semdy/extract-i18n-plugin/blob/main/LICENSE)

extract-i18n-plugin is an all-in-one vite/rollup/webpack/babel/cli plugin that combines extract, compile, rewrite, and translate capabilities. It supports projects based on React, Vue (including uni-app), Svelte5, and Solid.js. View [examples](https://github.com/semdy/extract-i18n-plugin/tree/main/examples) for more information. With this plugin, multilingual work becomes effortless and pain-free, providing a one-stop solution.

# USAGE

## Install

```bash
# npm
npm install extract-i18n-plugin -D
# yarn
yarn add extract-i18n-plugin -D
# pnpm
pnpm add extract-i18n-plugin -D
```

## CLI

`extract-i18n` is a command-line tool with core functionalities: extracting, compiling, rewriting, and translating.

Example:

```bash
extract-i18n --includePath=src --rewrite
```

This will extract all `fromLang` content from files with `allowedExtensions` in the src directory, automatically generate and translate JSON language packs, and create corresponding translation JSON files.

## Programming API

```javascript
const { extractI18n } = require("extract-i18n-plugin");

extractI18n(options)
  .then(() => {
    console.log("extract done!");
  })
  .catch(err => {
    console.error("extract error:", err);
  });
```

## Options

```javascript
const defaultOptions = {
  translateKey: "$t", // Name of the extraction function
  JSXElement: "Trans", // JSX element name for extraction, e.g., <Trans id="aaa" msg="xxx" />
  hooksIdentifier: "useTranslation", // Hook name injected into component, injects const { $t } = useTranslation()
  injectHooks: false, // Whether to automatically inject useTranslation into components
  jsx: false, // Enable JSX syntax transformation, pure text in JSX will be converted to <Trans id="aaa" msg="xxx" /> instead of $t("aaa")
  rewrite: false, // Whether to convert extracted content to ID and rewrite into source files
  extractFromText: true, // Whether to allow extracting translation content from plain text nodes
  autoImportI18n: true, // Whether to automatically import i18n module
  autoTranslate: true, // Whether to automatically translate after extraction
  cleanTranslate: true, // Whether to clean up unused translation content
  keepRaw: false, // When enabled, only convert without generating hash, i.e.: "test" -> $t("test"), effective when rewrite is enabled
  keepDefaultMsg: false, // Keep default message, i.e.: "test" -> $t("hashedKey", "test")
  defaultMsgPos: 1, // Default message parameter position, 0 for first parameter, 1 for second parameter, effective when keepDefaultMsg is enabled
  enableCombinedSourcemap: false, // Whether to enable combined source maps
  enabled: true, // Whether to enable the plugin
  debug: true, // Whether to print logs
  translateInterval: 1000, // Time interval between translating different languages, may be throttled if too short
  excludedCall: [], // Array of function names to exclude, built-in functions: see https://github.com/semdy/extract-i18n-plugin/blob/main/lib/utils.js#L244
  includePath: ['src/'], // Array of paths to include
  excludedPath: ['**/node_modules/**'], // Array of paths to exclude, refer to https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#how-to-exclude-directory-from-reading
  allowedExtensions: [".vue", ".nvue", ".uvue", ".svelte", ".tsx", ".ts", ".jsx", ".js", ".uts"], // Allowed file extensions for extraction
  fromLang: 'zh-cn', // Source language, currently supported extraction languages: zh-cn(zh-tw), en, ja, ko, ru
  translateLangKeys: ["zh-tw", "en"], // Target language keys for translation
  i18nPkgImportPath: "@/i18n", // i18n package import path
  outputPath: "src/i18n", // Output path for extracted language packages
  generateId: null, // Custom function to generate keys
  shouldExtract: null, // Custom function to determine whether to extract a text node
  customGenLangFileName: langKey => langKey, // Custom function to generate language file names
  // Post-processing function for translated text for secondary operations like capitalizing first letters of words
  // params: text: translated text, toLang: target language after translation, an enum member of translateLangKeys
  customTranslatedText: (text, toLang) => text,
  /* Translator, uses GoogleTranslator by default, can also implement custom Translator interface */
  translator: new GoogleTranslator()
  /** If port forwarding is enabled, configure the port, e.g.: 7890 */
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

Create extract-i18n.config.js in the project root directory for CLI and vite/webpack/babel plugin parameter configuration. Example:

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

// TS support for extract-i18n.config.ts
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
    // For runtime transformation
    vitePluginI18n(userConfig)
  ]
});
```

Parameter priority: userConfig > extract.config.js > defaultOptions

## Rollup plugin

```javascript
import vue from "rollup-plugin-vue";
import resolve from "@rollup/plugin-node-resolve";
import { rollupPluginI18n } from "extract-i18n-plugin";

export default {
  plugins: [
    resolve(),
    vue(),
    // For runtime transformation
    rollupPluginI18n(userConfig)
  ]
};
```

Parameter priority: userConfig > extract.config.js > defaultOptions

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

Parameter priority: same as above

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

Babel plugin does not automatically include configuration from extract.config.js but includes defaultOptions. Priority: userConfig > defaultOptions

## Deprecated

The `babel-plugin-i18n-import`, `rollup-plugin-i18n-import`, `vite-plugin-i18n-import`, and `webpack-i18n-import-loader` in the repository are deprecated because the main plugin includes automatic i18n import generation logic.

## **Important Note**

In Vue 3, when vue-i18n version is greater than 9.0.0, legacy must be set to false, otherwise you may encounter a `Uncaught TypeError: 'set' on proxy: trap returned falsish for property '$t'` proxy error during development. Recommended usage:

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

// Export a $t method
export const $t = i18n.global.t.bind(i18n.global);

export default i18n;
```

Additionally: If you don't want to use vite/webpack plugins, you can manually call `extract-i18n --rewrite`, which will rewrite the converted code into source files (useful for uni-app X projects).

## Known Issues

- Due to svelte and solid-js compilers' static hoisting optimization strategies, pure text extraction is not supported. Use explicit `$t("text")` calls in source code instead.

- Vue compiler also has static hoisting and static node marking (patchFlag) optimizations. This plugin will remark them as dynamic nodes, otherwise when switching languages, nodes won't update. In most cases pure text extraction works fine, but if there are issues, use explicit `$t("text")` calls.

- Recommendations for uni-app mini-program projects: Write plain text during development, then use `extract-i18n --rewrite --keepRaw` to convert, transforming `"text"` to `$t("text")` and writing to source code. The plugin won't work normally otherwise because according to uni-app compiler strategy, static text is kept in wxml files while only dynamic content is compiled to js files, allowing proper extraction and transformation.

- For uni-app X projects with Kotlin-based underlying compiler, source code must be pre-converted. Recommended to use `extract-i18n --rewrite --keepDefaultMsg` to convert `"text"` to `$t("id","text")`, ensuring i18n functionality while maintaining source code readability.

- Svelte4 typescript projects do not support static extraction because the 4.0 compiler does not support typescript.

# Translators

The plugin uses Google Translate by default (proxy port 7890 by default configuration). When network access to Google is not available, we recommend **Youdao Translator** ✨, which provides excellent translation quality. The plugin currently includes Google, Youdao, and Baidu translators. For custom translators, refer to the examples below.

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

## Youdao Translate

Requires API application, [API documentation](https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html).

```javascript
import { YoudaoTranslator } from 'extract-i18n-plugin/translators'

...
translator: new YoudaoTranslator({
    appId: 'your applied appId',
    appKey: 'your applied appKey'
})
...
```

## Baidu Translate

Requires API application, [API documentation](https://api.fanyi.baidu.com/product/113).

```javascript
import { BaiduTranslator } from 'extract-i18n-plugin/translators'

...
translator: new BaiduTranslator({
    appId: 'your Baidu Translate AppId',
    appKey: 'your Baidu Translate AppKey'
})
...
```

## VolcEngine AI Translate

Supports calling `doubao` or `deepseek` for translation. AI large model translation is more accurate than traditional API translation but takes longer.

VolcEngine Large Model Documentation: https://www.volcengine.com/docs/82379/1099455.

Requires enabling large model services and applying for API access, [API documentation](https://www.volcengine.com/docs/82379/1298454).

```javascript
import { VolcEngineTranslator } from 'extract-i18n-plugin/translators'

...
translator: new VolcEngineTranslator({
    apiKey: 'your applied apiKey',
    model: 'the model you want to call, e.g.: `doubao-1-5-pro-32k-250115`, make sure you have enabled the corresponding model in the console before use'
})
...
```

## Empty Translate

If you only need to scan target languages without translation, this translator generates JSON files.

```javascript
import { EmptyTranslator } from 'extract-i18n-plugin/translators'

...
translator: new EmptyTranslator()
...
```

## Custom Translate

If you have a custom translation interface, you can define a custom translator as follows:

The simplest way is to use the Translator base class to define a translator instance.

```javascript
import { Translator } from 'extract-i18n-plugin/translators'
import axios from 'axios'

...
translator: new Translator({
    name: 'My Translator',
    // Translation method
    fetchMethod: (str, fromKey, toKey, _separator) => {
        // Actual API calls may be more complex than the example. For reference, check YoudaoTranslator implementation in src\translators\youdao.js
        const myApi = 'https://www.my-i18n.cn/api/translate?from=${fromKey}&to=${toKey}&t={+new Date}'
        return axios.post(myApi, { str })
            .then(res => res.data)
    },
    // API call interval. Some interfaces may blacklist frequent calls, set a reasonable interval based on actual situation
    interval: 1000
})
...
```

For more advanced features, you can use inheritance, though there are currently no such use cases.

```javascript
import { Translator } from 'extract-i18n-plugin/translators'

class CustomTranslator extends Translator {
    constructor () {
        super({
            name: 'My Translator',
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
