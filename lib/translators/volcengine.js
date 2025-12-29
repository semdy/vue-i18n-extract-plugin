// 代码灵感来自https://github.com/dadidi9900/auto-plugins-json-translate/blob/main/src/services/translationService.ts
const axios = require("axios");
const { generateId: _generateId } = require("../utils");
const { Translator } = require("./translator");

/**
 * 火山引擎翻译器，内置豆包、deepseek等模型
 * 
 * 火山引擎大模型介绍：https://www.volcengine.com/docs/82379/1099455
 * 
 * api文档：https://www.volcengine.com/docs/82379/1298454
 * 
 * 使用方式：
 * ```ts
 * vitePluginI18n({
    ...
    translator: new VolcEngineTranslator({
        apiKey: '你申请的apiKey',
        model: '你要调用的模型，如：`doubao-1-5-pro-32k-250115`，请确保使用前已在控制台开通了对应模型'
    })
})
 * ```
 */
class VolcEngineTranslator extends Translator {
  constructor(option = {}) {
    super({
      name: "火山引擎ai翻译",
      fetchMethod: async (
        text,
        fromKey,
        toKey,
        separator,
        customGenerateId
      ) => {
        let salt = new Date().getTime();
        const textArr = text.split(separator);

        const generateId = text => {
          if (typeof customGenerateId === "function") {
            return customGenerateId(text, _generateId);
          }
          return _generateId(text);
        };

        const sourceMap = Object.fromEntries(
          textArr.map(text => [generateId(text), text])
        );
        const data = {
          model: option.model,
          messages: [
            {
              role: "system",
              content: `
                ###
                假如你是一个专业的翻译助手，你将根据一个${option.desc ? option.desc + "的" : ""}web项目中使用的文本组成的JSON对象，来解决将数组每个成员从源语言A翻译成目标语言B并返回翻译后的JSON对象的任务。根据以下规则一步步执行：
                1. 明确源语言A和目标语言B。
                2. 对JSON对象中数组的每个成员进行从源语言A到目标语言B的翻译。
                3. 将翻译后的内容以JSON对象格式返回。

                参考例子：
                示例1：
                输入：zh-cn -> en { "awfgx": "你好", "qwfga": "世界" }
                输出：{ "awfgx": "Hello", "qwfga": "World" }
                说明：输出的英文句子如果较短，则每个单词的首字母大写，如果是长句子则保持原样。
                示例: "查看详情" 翻译为 "View Details"，"优惠券发放时间" 翻译为 "Coupon Award Time"。
                建议：句子单词数不超过3个时每个单词首字母大写，超过3个单词时保持原样。

                示例2：
                输入：de -> fr { "gweaq": "Hallo", "wtrts": "Welt" }
                输出：{ "gweaq": "Bonjour", "wtrts": "Monde" }

                请回答问题：
                输入：源语言A -> 目标语言B { "wghhj": "XXX" }
                输出：

                要求：
                1 以JSON对象格式输出
                2 JSON对象中每个成员为翻译后的内容
                3 翻译后的内容尽可能本土化、精准、自然、不丢失原意
                4 保持JSON对象的键不变
                5 如果无法翻译，请返回原内容
                ###
            `
            },
            {
              role: "user",
              content: `${fromKey} -> ${toKey} ${JSON.stringify(sourceMap)}`
            }
          ]
        };
        const response = await axios.post(
          `https://ark.cn-beijing.volces.com/api/v3/chat/completions?t=${salt}`,
          data,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${option.apiKey}`
            },
            proxy: option.proxy
          }
        );

        let resultTextArr = Array.from(textArr).fill("");
        const content = response.data.choices[0].message.content;
        try {
          let resultMap;
          try {
            resultMap = JSON.parse(content);
          } catch (error) {
            throw new Error("大模型返回文本解析失败");
          }
          if (typeof resultMap !== "object" || !resultMap) {
            throw new Error("大模型返回文本解析后类型不正确");
          }
          const isMiss = Object.keys(resultMap).some(
            key => !(key in sourceMap)
          );
          if (isMiss) {
            throw new Error("大模型返回文本内容不完整");
          }
          resultTextArr = textArr.map(text => resultMap[generateId(text)]); // 用textArr遍历，保证顺序
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          console.warn("⚠", message);
          console.warn("⚠ 返回的文本内容：", content);
          console.warn("⚠ 原文本内容：", JSON.stringify(sourceMap));
        }

        return resultTextArr.join(separator);
      },
      onError: (error, cb) => {
        cb(error);
        console.error(
          "请确保在火山引擎控制台开通了对应模型，且有足够的token余额。控制台地址：https://console.volcengine.com/ark/"
        );
      },
      maxChunkSize: 1000, // 太长可能会导致返回文本不完整
      interval: option.interval ?? 1000
    });
  }
}

module.exports = {
  VolcEngineTranslator
};
