import { defineConfig } from "vue-i18n-extract-plugin";
import { GoogleTranslator } from "vue-i18n-extract-plugin/translators";

export default defineConfig({
  includePath: [
    "src/components",
    "src/helpers",
    "src/views",
    "src/pages",
    "src/utils",
    "src/App.vue"
  ],
  excludedPath: ["**/node_modules/**"],
  excludedCall: ["formatAppLog", "__f__"],
  rewrite: false,
  keepDefaultMsg: process.env.NODE_ENV === "development",
  defaultMsgPos: 2,
  outputPath: "src/locales/gen",
  i18nPkgImportPath: "@/locales",
  translateLangKeys: ["en", "zh-tw", "ja", "ko"],
  customTranslatedText: (text: string, toLang: string): string => {
    if (toLang === "en") {
      const textArr = text.split(/\s+/);
      // 少于4个单词的句子每个单词首字母大写
      if (textArr.length <= 3) {
        return textArr
          .map(v => {
            return v.charAt(0).toUpperCase() + v.slice(1);
          })
          .join(" ");
      }
    }
    return text;
  },
  translator: new GoogleTranslator({
    // 配置代理，如无需代理即可科学上网则不需要此配置，直接使用 new GoogleTranslator() 即可
    proxyOption: {
      port: 7890,
      host: "127.0.0.1",
      headers: {
        "User-Agent": "Node"
      }
    }
  })
});
