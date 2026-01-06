import axios from "axios";
import { Translator } from "./translator/index.js";
import CryptoJS from "crypto-js";

/**
 * 百度翻译器
 * 
 * api文档：https://api.fanyi.baidu.com/product/113
 * 
 * 使用方式：
 * ```ts
 * vitePluginI18n({
    ...
    translator: new BaiduTranslator({
        appId: '你申请的appId',
        appKey: '你申请的appKey'
    })
})
 * ```
 */
export class BaiduTranslator extends Translator {
  /** 百度的语言类型映射不标准，需要手动控制 */
  BAIDU_TRANSLATE_KEY_CONVERT_MAP = {
    "zh-cn": "zh",
    "zh-tw": "cht",
    ja: "jp",
    ko: "kor"
  };

  getTranslateKey(key) {
    return this.BAIDU_TRANSLATE_KEY_CONVERT_MAP[key] || key;
  }

  constructor(option = {}) {
    super({
      name: "百度翻译",
      fetchMethod: async (text, fromKey, toKey, separator) => {
        let salt = new Date().getTime();

        const data = {
          q: text,
          appid: option.appId,
          from: this.getTranslateKey(fromKey),
          to: this.getTranslateKey(toKey),
          salt,
          sign: CryptoJS.MD5(
            option.appId + text + salt + option.appKey
          ).toString()
        };
        const response = await axios.post(
          "https://fanyi-api.baidu.com/api/trans/vip/translate",
          data,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            proxy: option.proxy
          }
        );

        const { error_code, error_msg, trans_result } = response.data || {};

        if (error_code) {
          console.error(
            `❌ 百度翻译错误：${error_code} - ${error_msg}，请检查你的 appId 和 appKey 是否正确。`
          );
          return "";
        }

        const translatedTexts = trans_result
          .map(item => item.dst)
          .filter((_item, index) => index % 2 === 0)
          .join(separator);

        // 请求成功，返回响应数据
        return translatedTexts || "";
      },
      onError: (error, cb) => {
        cb(error);
        console.error(
          "请前往百度翻译官方申请翻译key，每个月都有免费额度，并请检查额度是否充足。"
        );
      },
      interval: option.interval ?? 1000
    });
  }
}
