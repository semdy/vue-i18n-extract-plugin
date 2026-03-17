import { defineConfig } from "extract-i18n-plugin";
import { GoogleTranslator } from "extract-i18n-plugin/translators";

export default defineConfig({
  includePath: ["src"],
  excludedPath: ["**/node_modules/**", "**/src/locales", "**/src/**/*.d.marko"],
  excludedCall: ["formatAppLog", "__f__"],
  translateKey: "t",
  rewrite: false,
  jsx: false,
  injectHooks: false,
  JSXElement: "trans",
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
  }) as any
});
