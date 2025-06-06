# vue-i18n-extract-plugin

- 针对vue/react项目，从js/jsx/ts/tsx/vue文件提取中文，并生成语言包到json文件中，并支持将生成的key重写入文件中.
- 包含了vite和webpack的插件.

# USAGE
## CLI
```bash
node vue-i18n-extract-plugin/extract.js --includePath='[\"demo\"]' --rewrite
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

# TODO
 - Auto Translator(Goggle Translate、Baidu Translate、YouDao Translate、Custom Translate)