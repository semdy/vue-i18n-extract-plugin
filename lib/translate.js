const fs = require("fs-extra");
const {
  isEmptyObject,
  getLangJsonPath,
  readJsonWithDefault,
  sleep
} = require("./utils");
const { defaultOptions } = require("./options");

const SEPARATOR = "\n┇┇┇\n";
const SPLIT_SEPARATOR_REGEX = /\n┇ *┇ *┇\n/;

/**
 * 智能文本分块处理器
 * @param values 待分块的原始文本数组
 * @param maxChunkSize 最大分块长度
 * @returns 包含分块文本和重组方法的对象
 *
 * 功能特性：
 * 1. 自动合并小文本为最大可能块
 * 2. 处理超长文本并给出警告
 * 3. 保证块长度不超过限制
 * 4. 保留原始顺序和分隔符语义
 */
function createTextSplitter(values, maxChunkSize) {
  // 分隔符定义（用于合并/拆分时保持语义）
  const SEP_LENGTH = SEPARATOR.length;

  // 结果存储和缓冲区
  const result = []; // 最终分块结果
  let buffer = []; // 当前累积块缓冲区
  let currentSize = 0; // 当前缓冲区字符数（含分隔符）

  /**
   * 提交缓冲区内容到结果集
   * - 将缓冲区内容用分隔符连接
   * - 重置缓冲区和计数器
   */
  const commitBuffer = () => {
    if (buffer.length > 0) {
      // 计算实际连接长度用于验证
      const actualLength = buffer.join(SEPARATOR).length;
      if (actualLength > maxChunkSize) {
        console.warn(`缓冲区提交异常：生成块长度 ${actualLength} 超过限制`);
      }

      result.push(buffer.join(SEPARATOR));
      buffer = [];
      currentSize = 0;
    }
  };

  // 主处理循环：遍历所有原始文本项
  for (const value of values) {
    // 计算需要新增的空间：文本长度 + 分隔符（非首项）
    const neededSpace = value.length + (buffer.length > 0 ? SEP_LENGTH : 0);

    // ─── 超长文本处理策略 ───
    if (value.length > maxChunkSize) {
      // 优先提交现有缓冲区内容
      if (buffer.length > 0) commitBuffer();

      /**
       * 超长文本处理逻辑：
       * - 长度超过1.5倍限制时发出强警告
       * - 强制单独成块（即使超过限制）
       * - 后续需要特殊处理这些异常块
       */
      if (value.length > maxChunkSize * 1.5) {
        console.warn(
          `超长文本告警：检测到长度 ${value.length} 字符的文本项，可能影响翻译质量`
        );
      }
      // 结果直接新增一个超长文本
      result.push(value);
      continue;
    }

    // ─── 正常分块逻辑 ───
    // 空间不足时提交当前缓冲区
    if (currentSize + neededSpace > maxChunkSize) {
      commitBuffer();
    }

    // 更新缓冲区状态（累加长度需包含分隔符）
    currentSize += neededSpace;
    buffer.push(value);
  }

  // 提交最终未完成的缓冲区内容
  commitBuffer();

  // 返回分块结果
  return result;
}

function getI18nObjByLangKey(langKey, option) {
  const langJsonPath = getLangJsonPath(langKey, option);
  return readJsonWithDefault(langJsonPath, {});
}

function valuesToObject(values, keys) {
  const obj = {};
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = values[i];
  }
  return obj;
}

function cleanI18nMap(sourceObj, targetObj) {
  const result = {};
  Object.keys(targetObj).forEach(key => {
    if (sourceObj[key]) {
      result[key] = targetObj[key];
    }
  });
  return result;
}

async function autoTranslateFromFile() {
  const fromLangMap = readJsonWithDefault(
    getLangJsonPath(defaultOptions.fromLang, defaultOptions),
    null
  );
  if (!fromLangMap) {
    console.warn(
      `❌ 源语言文件 ${defaultOptions.fromLang}.json 为空，请先添加源语言内容`
    );
    return;
  }

  autoTranslate(fromLangMap);
}

async function autoTranslate(i18nMap, option) {
  option = { ...defaultOptions, ...option };
  // 初始化现有翻译文件缓存
  const langObjMap = {};
  //  待翻译语言缓存
  const toTransLangObjMap = {};

  // 加载所有语言的现有翻译内容
  option.translateLangKeys.forEach(langKey => {
    langObjMap[langKey] = getI18nObjByLangKey(langKey, option);
    toTransLangObjMap[langKey] = {};
  });

  // 比对出需要翻译的key
  Object.keys(i18nMap).forEach(i18nKey => {
    option.translateLangKeys.forEach(langKey => {
      if (langObjMap[langKey] && !langObjMap[langKey][i18nKey]) {
        toTransLangObjMap[langKey][i18nKey] = i18nMap[i18nKey];
      }
    });
  });

  // 遍历所有目标语言进行处理
  for (const langKey of Object.keys(toTransLangObjMap)) {
    const curLangObj = toTransLangObjMap[langKey];
    const curLangKeys = Object.keys(curLangObj);

    if (curLangKeys.length === 0) {
      console.info(`${langKey}无需翻译，跳过...`);
      continue;
    }

    console.info(
      `[${option.translator.option.name}] 开始自动翻译${langKey}...`
    );

    // ─── 分块翻译流程开始 ───
    const translatedValues = await translateChunks(curLangObj, langKey, option);
    // ─── 分块翻译流程结束 ───=

    // ─── 翻译结果校验 ───
    if (translatedValues.length !== curLangKeys.length) {
      console.error(
        "❌ 使用付费翻译时，请检查翻译API额度是否充足，或是否已申请对应翻译API使用权限"
      );
      console.error(`❌ ${langKey}翻译结果不完整
                预期数量: ${curLangKeys.length}
                实际数量: ${translatedValues.length}
                样例数据: ${JSON.stringify(translatedValues.slice(0, 3))}`);
      // return;
    }

    // 存储当前语言翻译结果
    toTransLangObjMap[langKey] = valuesToObject(translatedValues, curLangKeys);
    console.info(`✅ ${langKey} 翻译完成`);

    // 设置翻译每种语言的间隔时间，防止被墙
    await sleep(option.translateInterval);
  }

  // ─── 合并翻译结果到配置 ───
  for (const langKey of Object.keys(toTransLangObjMap)) {
    if (!isEmptyObject(toTransLangObjMap[langKey])) {
      try {
        const mergedLangObj = Object.assign(
          langObjMap[langKey],
          toTransLangObjMap[langKey]
        );
        // ─── 写入文件系统 ───
        await fs.outputJson(getLangJsonPath(langKey, option), mergedLangObj, {
          spaces: 2
        });
        console.info(`🎉 ${langKey} 配置文件已成功更新`);
      } catch (error) {
        console.error(`❌ ${langKey} 配置文件写入失败，原因:`, error);
      }
    }
  }
}

// 清理无用的翻译（以源语言作对照）
async function cleanTranslate(option) {
  option = { ...defaultOptions, ...option };
  // 初始化现有翻译文件缓存
  const langObjMap = {};
  const fromLangI18nMap = getI18nObjByLangKey(option.fromLang, option);

  // 加载所有语言的现有翻译内容
  option.translateLangKeys.forEach(langKey => {
    const currentLangI18nMap = getI18nObjByLangKey(langKey, option);
    const cleanedI18nMap = cleanI18nMap(fromLangI18nMap, currentLangI18nMap);
    if (
      Object.keys(cleanedI18nMap).length !==
      Object.keys(currentLangI18nMap).length
    ) {
      langObjMap[langKey] = cleanedI18nMap;
    }
  });

  // 将清理后的语言对象写入文件
  for (const langKey of Object.keys(langObjMap)) {
    await fs.outputJson(getLangJsonPath(langKey, option), langObjMap[langKey], {
      spaces: 2
    });
    console.info(`🎉 ${langKey} 配置文件清理成功`);
  }
}

// 分块翻译流程函数
async function translateChunks(transLangObj, toTranslateLang, option) {
  const { translator } = option;
  // 获取分块后的文本列表
  const translationChunks = createTextSplitter(
    Object.values(transLangObj),
    translator.option.maxChunkSize
  );
  // 并行执行分块翻译
  const translatePromises = [];
  for (let i = 0; i < translationChunks.length; i++) {
    translatePromises.push(
      translator.translate(
        translationChunks[i],
        option.fromLang,
        toTranslateLang,
        SEPARATOR
      )
    );
  }

  // 等待所有分块完成并合并结果
  const chunkResults = await Promise.all(translatePromises);
  const customTranslatedText =
    typeof option.customTranslatedText !== "function"
      ? text => text
      : option.customTranslatedText;

  return chunkResults
    .map(item => {
      // 提取分割逻辑到单独的函数中，提高代码复用性
      const splitTranslation = (text, separatorRegex) => {
        return text
          .split(separatorRegex)
          .map(v => customTranslatedText(v.trim(), toTranslateLang));
      };

      // 分割符可能会被翻译，所以这里做了兼容处理
      if (SPLIT_SEPARATOR_REGEX.test(item)) {
        return splitTranslation(item, SPLIT_SEPARATOR_REGEX);
      } else {
        const lines = item.split("\n");
        const separator = lines.find(line => line.length === 3);
        let value = [];
        if (separator) {
          value = splitTranslation(item, new RegExp(`\\n${separator}\\n`));
        }
        const realList = value.filter(Boolean);
        if (realList.length > 1) {
          return realList;
        }
        return splitTranslation(item, SPLIT_SEPARATOR_REGEX);
      }
    })
    .flat();
}

module.exports = {
  autoTranslateFromFile,
  autoTranslate,
  cleanTranslate,
  translateChunks,
  createTextSplitter,
  cleanI18nMap
};
